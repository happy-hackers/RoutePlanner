import { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Space,
  App,
  Cascader,
  type CascaderProps,
} from "antd";
import { CopyOutlined, ReloadOutlined, CheckOutlined } from "@ant-design/icons";
import { addDispatcher, updateDispatchers } from "../utils/dbUtils";
import {
  createDriverAuth,
  generateRandomPassword,
  updateDriverPassword,
} from "../utils/authUtils";
import type { Dispatcher } from "../types/dispatchers";
import areaData from "../hong_kong_areas.json";
import { useTranslation } from "react-i18next";

const { Option } = Select;
const { SHOW_CHILD } = Cascader;

interface Option {
  value: string | number;
  label: string;
  children?: Option[];
}

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const periods = ["Morning", "Afternoon", "Evening"];

interface ActiveDaysInputProps {
  value?: Record<string, string[]>;
  onChange?: (value: Record<string, string[]>) => void;
}

const ActiveDaysInput = ({ value = {}, onChange }: ActiveDaysInputProps) => {
  const { t } = useTranslation(["addDispatcher"]);

  const handleCheckboxChange = (
    day: string,
    period: string,
    checked: boolean
  ) => {
    const currentPeriods = value[day] || [];
    const newPeriods = checked
      ? [...currentPeriods, period]
      : currentPeriods.filter((p: string) => p !== period);

    const newValue = { ...value };
    if (newPeriods.length > 0) {
      newValue[day] = newPeriods;
    } else {
      delete newValue[day];
    }

    onChange?.(newValue);
  };

  const handleDayCheckboxChange = (day: string, checked: boolean) => {
    const newValue = { ...value };
    if (checked) {
      newValue[day] = [...periods];
    } else {
      delete newValue[day];
    }
    onChange?.(newValue);
  };

  return (
    <div
      style={{
        border: "1px solid #d9d9d9",
        borderRadius: "4px",
        padding: "12px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 60px repeat(3, 1fr)",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <div></div>
        <div></div>
        {periods.map((period) => (
          <div
            key={period}
            style={{
              fontWeight: "bold",
              textAlign: "center",
              color: "black",
            }}
          >
            {t(`period_${period.toLowerCase()}`)}
          </div>
        ))}

        {days.map((day) => {
          const dayPeriods = value[day] || [];
          const isAllSelected = dayPeriods.length === periods.length;

          return (
            <div key={day} style={{ display: "contents" }}>
              <div style={{ textAlign: "center" }}>
                <Checkbox
                  checked={isAllSelected}
                  onChange={(e) =>
                    handleDayCheckboxChange(day, e.target.checked)
                  }
                />
              </div>
              <div style={{ fontWeight: "500", color: "black" }}>
                {t(`day_${day}`)}
              </div>
              {periods.map((period) => (
                <div key={`${day}-${period}`} style={{ textAlign: "center" }}>
                  <Checkbox
                    checked={dayPeriods.includes(period)}
                    onChange={(e) =>
                      handleCheckboxChange(day, period, e.target.checked)
                    }
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
  const [password, setPassword] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation(["addDispatcher", "hongkong"]);

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setPassword(newPassword);
    message.success(t("msg_password_generated"));
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    message.success(t("msg_password_copied"));
  };

  const resetPassword = async () => {
    if (showPasswordReset && password && dispatcher?.authUserId) {
      const pwdResult = await updateDriverPassword(
        dispatcher.authUserId,
        password
      );
      if (pwdResult.success) {
        message.success(t("msg_edit_pwd_success"));
        navigator.clipboard.writeText(password);
      } else {
        message.warning(t("msg_edit_pwd_fail", { error: pwdResult.error }));
      }
    }
  };

  const handleResetPassword = async () => {
    await resetPassword();
    setShowPasswordReset(false);
  };

  useEffect(() => {
    if (visible) {
      form.resetFields(); 
      setPassword("");
      setShowPasswordReset(false);

      if (mode === "edit" && dispatcher) {
        form.setFieldsValue({
          name: dispatcher.name,
          email: dispatcher.email,
          phone: dispatcher.phone,
          activeDay: dispatcher.activeDay || {},
          responsibleArea: dispatcher.responsibleArea,
        });
      } else {
        setPassword(generateRandomPassword());
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
        let authUserId: string | undefined;

        if (values.email && password) {
          const authResult = await createDriverAuth({
            email: values.email,
            password: password,
            dispatcherId: 0,
            name: values.name,
          });

          if (!authResult.success) {
            message.error(authResult.error || t("msg_auth_fail_default"));
            setLoading(false);
            return;
          }

          authUserId = authResult.user?.id;
        }

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
            message.success(t("msg_add_auth_success"));
            navigator.clipboard.writeText(password);
          } else {
            message.success(t("msg_add_noauth_success"));
          }
          onSuccess();
          onCancel();
        } else {
          message.error(t("msg_add_fail", { error: result.error }));
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
          resetPassword();
          message.success(t("msg_edit_success"));
          onSuccess();
          onCancel();
        } else {
          message.error(t("msg_edit_fail", { error: result.error }));
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      message.error(t("msg_network_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };
  const onChange: CascaderProps<Option, "value", true>["onChange"] = (
    value
  ) => {
    console.log(value);
  };

  const options: Option[] = Object.entries(areaData).map(
    ([region, districts]) => ({
      label: t(`region_${region}`.replace(/ /g, "_"), { ns: "hongkong" }),
      value: region,
      children: Object.keys(districts).map((district) => ({
        label: t(`area_${district}`.replace(/ /g, "_"), { ns: "hongkong" }),
        value: district,
      })),
    })
  );

  return (
    <Modal
      title={mode === "add" ? t("modal_title_add") : t("modal_title_edit")}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
      destroyOnHidden={true} 
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="name"
          label={t("label_name")}
          rules={[{ required: true, message: t("validation_name_required") }]}
        >
          <Input placeholder={t("placeholder_name")} />
        </Form.Item>

        <Form.Item
          name="email"
          label={t("label_email")}
          rules={[{ type: "email", message: t("validation_email_invalid") }]}
        >
          <Input placeholder={t("placeholder_email")} type="email" />
        </Form.Item>

        <Form.Item name="phone" label={t("label_phone")}>
          <Input placeholder={t("placeholder_phone")} />
        </Form.Item>

        {mode === "add" ? (
          <Form.Item label={t("label_password_add")}>
            <Space.Compact style={{ width: "100%" }}>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("placeholder_password")}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={handleGeneratePassword}
                title={t("button_generate_password")}
              />
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyPassword}
                type="primary"
                title={t("button_copy_password")}
              />
            </Space.Compact>
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
              {t("text_copy_password_tip")}
            </div>
          </Form.Item>
        ) : (
          dispatcher?.authUserId && (
            <Form.Item label={t("label_password_edit")}>
              {!showPasswordReset ? (
                <Button
                  onClick={() => {
                    setShowPasswordReset(true);
                    setPassword(generateRandomPassword());
                  }}
                >
                  {t("button_reset_password")}
                </Button>
              ) : (
                <>
                  <Space.Compact style={{ width: "100%" }}>
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("placeholder_new_password")}
                    />
                    <Button
                      icon={<CheckOutlined />}
                      onClick={handleResetPassword}
                      type="primary"
                      style={{
                        backgroundColor: "green",
                      }}
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
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    {t("text_new_password_tip")}
                  </div>
                </>
              )}
            </Form.Item>
          )
        )}

        <Form.Item name="activeDay" label={t("label_active_days")}>
          <ActiveDaysInput />
        </Form.Item>

        <Form.Item name="responsibleArea" label={t("label_responsible_areas")}>
          <Cascader
            style={{ width: "100%" }}
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
              {mode === "add" ? t("button_add") : t("button_update")}
            </Button>
            <Button onClick={handleCancel}>{t("button_cancel")}</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}