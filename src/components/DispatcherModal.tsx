import { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Checkbox, Button, Space, App, Cascader, type CascaderProps } from "antd";
import { CopyOutlined, ReloadOutlined } from "@ant-design/icons";
import { addDispatcher, updateDispatchers } from "../utils/dbUtils";
import { createDriverAuth, updateDriverPassword } from "../utils/authUtils";
import type { Dispatcher } from "../types/dispatchers";
import areaData from "../hong_kong_areas.json"

const { Option } = Select;
const { SHOW_CHILD } = Cascader;
interface Option {
  value: string | number;
  label: string;
  children?: Option[];
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const periods = ["Morning", "Afternoon", "Evening"];

const options: Option[] = Object.entries(areaData).map(([region, districts]) => ({
  label: region,
  value: region,
  children: Object.keys(districts).map((district) => ({
    label: district,
    value: district,
  })),
}));

interface DispatcherModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  dispatcher?: Dispatcher;
  mode: "add" | "edit";
}

export default function DispatcherModal({
  visible,
  onCancel,
  onSuccess,
  dispatcher,
  mode,
}: DispatcherModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [password, setPassword] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setPassword(newPassword);
    message.success('New password generated');
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    message.success('Password copied to clipboard');
  };

  /*const getDistrictOptions = (selectedRegions: string[]) => {
    return Object.entries(areaData)
      .filter(([region]) => selectedRegions.includes(region))
      .map(([region, districts]) => ({
        label: region,
        value: region,
        children: Object.keys(districts).map((district) => ({
          label: district,
          value: district,
        })),
      }));
  };

  const districtOptions = useMemo(
    () => getDistrictOptions(selectedAreas),
    [selectedAreas]
  );*/

  useEffect(() => {
    if (visible) {
      if (mode === "edit" && dispatcher) {
        // edit mode: fill existing data
        form.setFieldsValue({
          name: dispatcher.name,
          email: dispatcher.email,
          phone: dispatcher.phone,
          activeDay: dispatcher.activeDay,
          responsibleArea: dispatcher.responsibleArea,
        });
        setPassword('');
        setShowPasswordReset(false);
      } else {
        // add mode: clear form and generate password
        form.resetFields();
        setPassword(generateRandomPassword());
        setShowPasswordReset(false);
      }
    }
  }, [visible, mode, dispatcher, form]);

  const handleSubmit = async (values: {
    name: string;
    email?: string;
    phone?: string;
    activeDay: Record<string, string[]>;
    responsibleArea: string[][];
  }) => {
    try {
      setLoading(true);

      if (mode === "add") {
        // Create auth account if email is provided
        let authUserId: string | undefined;

        if (values.email && password) {
          const authResult = await createDriverAuth({
            email: values.email,
            password: password,
            dispatcherId: 0, // Will be updated after dispatcher is created
            name: values.name,
          });

          if (!authResult.success) {
            message.error(authResult.error || 'Failed to create auth account');
            setLoading(false);
            return;
          }

          authUserId = authResult.user?.id;
        }

        // Create dispatcher record
        const result = await addDispatcher({
          name: values.name,
          email: values.email,
          phone: values.phone,
          authUserId: authUserId,
          activeDay: values.activeDay || {},
          responsibleArea: values.responsibleArea || [],
        });

        if (result.success && result.data) {
          if (values.email && password) {
            message.success("Dispatcher added with auth account! Password copied to clipboard.");
            navigator.clipboard.writeText(password);
          } else {
            message.success("Dispatcher added successfully!");
          }
          onSuccess();
          onCancel();
        } else {
          message.error(`Failed to add dispatcher: ${result.error}`);
        }
      } else {
        if (!dispatcher) return;

        const updatedDispatcher: Dispatcher = {
          ...dispatcher,
          name: values.name,
          email: values.email,
          phone: values.phone,
          activeDay: values.activeDay || {},
          responsibleArea: values.responsibleArea || [],
        };

        const result = await updateDispatchers([updatedDispatcher]);

        if (result.success) {
          // If password reset was requested
          if (showPasswordReset && password && dispatcher.authUserId) {
            const pwdResult = await updateDriverPassword(dispatcher.authUserId, password);
            if (pwdResult.success) {
              message.success('Dispatcher updated and password reset! Password copied to clipboard.');
              navigator.clipboard.writeText(password);
            } else {
              message.warning('Dispatcher updated but password reset failed: ' + pwdResult.error);
            }
          } else {
            message.success("Dispatcher updated successfully!");
          }
          onSuccess();
          onCancel();
        } else {
          message.error(`Failed to update dispatcher: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      message.error("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };
  const onChange: CascaderProps<Option, 'value', true>['onChange'] = (value) => {
    console.log(value);
  };

  return (
    <Modal
      title={mode === "add" ? "Add New Dispatcher" : "Edit Dispatcher"}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          activeDay: {},
          responsibleArea: [],
        }}
      >
        <Form.Item
          name="name"
          label="Dispatcher Name"
          rules={[{ required: true, message: "Please enter dispatcher name" }]}
        >
          <Input placeholder="Enter dispatcher name" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email (for driver login)"
          rules={[
            { type: 'email', message: 'Please enter valid email' },
          ]}
        >
          <Input placeholder="driver@example.com" type="email" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input placeholder="+852 1234 5678" />
        </Form.Item>

        {/* Password Section */}
        {mode === "add" ? (
          <Form.Item label="Password (for driver login)">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={handleGeneratePassword}
                title="Generate random password"
              />
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyPassword}
                type="primary"
                title="Copy password"
              />
            </Space.Compact>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              Copy this password to send to the driver via SMS/WhatsApp
            </div>
          </Form.Item>
        ) : (
          dispatcher?.authUserId && (
            <Form.Item label="Password">
              {!showPasswordReset ? (
                <Button
                  onClick={() => {
                    setShowPasswordReset(true);
                    setPassword(generateRandomPassword());
                  }}
                >
                  Reset Password
                </Button>
              ) : (
                <>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
                    />
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleGeneratePassword}
                    />
                    <Button
                      icon={<CopyOutlined />}
                      onClick={handleCopyPassword}
                      type="primary"
                    />
                  </Space.Compact>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    New password will be set when you save
                  </div>
                </>
              )}
            </Form.Item>
          )
        )}

        <Form.Item name="activeDay" label="Active Days">
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue, setFieldValue }) => {
              const activeDay = getFieldValue("activeDay") || {};

              const handleCheckboxChange = (day: string, period: string, checked: boolean) => {
                const currentPeriods = activeDay[day] || [];
                const newPeriods = checked
                  ? [...currentPeriods, period]
                  : currentPeriods.filter((p: string) => p !== period);

                const newActiveDay = { ...activeDay };
                if (newPeriods.length > 0) {
                  newActiveDay[day] = newPeriods;
                } else {
                  delete newActiveDay[day];
                }

                setFieldValue("activeDay", newActiveDay);
              };

              const handleDayCheckboxChange = (day: string, checked: boolean) => {
                const newActiveDay = { ...activeDay };
                if (checked) {
                  // Select all periods for this day
                  newActiveDay[day] = [...periods];
                } else {
                  // Deselect all periods for this day
                  delete newActiveDay[day];
                }
                setFieldValue("activeDay", newActiveDay);
              };

              return (
                <div style={{ border: "1px solid #d9d9d9", borderRadius: "4px", padding: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "40px 60px repeat(3, 1fr)", gap: "8px", alignItems: "center" }}>
                    {/* Header row */}
                    <div></div>
                    <div></div>
                    {periods.map((period) => (
                      <div key={period} style={{ fontWeight: "bold", textAlign: "center", color: "black" }}>
                        {period}
                      </div>
                    ))}

                    {/* Day rows */}
                    {days.map((day) => {
                      const dayPeriods = activeDay[day] || [];
                      const isAllSelected = dayPeriods.length === periods.length;

                      return (
                        <>
                          <div key={`${day}-checkbox`} style={{ textAlign: "center" }}>
                            <Checkbox
                              checked={isAllSelected}
                              onChange={(e) => handleDayCheckboxChange(day, e.target.checked)}
                            />
                          </div>
                          <div key={`${day}-label`} style={{ fontWeight: "500", color: "black" }}>
                            {day}
                          </div>
                          {periods.map((period) => (
                            <div key={`${day}-${period}`} style={{ textAlign: "center" }}>
                              <Checkbox
                                checked={dayPeriods.includes(period)}
                                onChange={(e) => handleCheckboxChange(day, period, e.target.checked)}
                              />
                            </div>
                          ))}
                        </>
                      );
                    })}
                  </div>
                </div>
              );
            }}
          </Form.Item>
        </Form.Item>

        <Form.Item name="responsibleArea" label="Responsible Areas">
          <Cascader
            style={{ width: '100%' }}
            options={options}
            onChange={onChange}
            multiple
            maxTagCount="responsive"
            showCheckedStrategy={SHOW_CHILD}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {mode === "add" ? "Add Dispatcher" : "Update Dispatcher"}
            </Button>
            <Button onClick={handleCancel}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
