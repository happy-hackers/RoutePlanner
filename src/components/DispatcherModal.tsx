import { useEffect } from "react";
import { Modal, Form, Input, Select, Checkbox, Button, Space, App, Cascader, type CascaderProps } from "antd";
import { addDispatcher, updateDispatchers } from "../utils/dbUtils";
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
  //const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [form] = Form.useForm();
  const { message } = App.useApp();

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
          activeDay: dispatcher.activeDay,
          responsibleArea: dispatcher.responsibleArea,
        });
      } else {
        // add mode: clear form
        form.resetFields();
      }
    }
  }, [visible, mode, dispatcher, form]);

  const handleSubmit = async (values: {
    name: string;
    activeDay: Record<string, string[]>;
    responsibleArea: string[][];
  }) => {
    try {
      if (mode === "add") {
        const result = await addDispatcher({
          name: values.name,
          activeDay: values.activeDay || {},
          responsibleArea: values.responsibleArea || [],
        });

        if (result.success && result.data) {
          message.success("Dispatcher added successfully!");
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
          activeDay: values.activeDay || {},
          responsibleArea: values.responsibleArea || [],
        };

        const result = await updateDispatchers([updatedDispatcher]);
        if (result.success) {
          message.success("Dispatcher updated successfully!");
          onSuccess();
          onCancel();
        } else {
          message.error(`Failed to update dispatcher: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      message.error("Network error occurred");
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
            <Button type="primary" htmlType="submit">
              {mode === "add" ? "Add Dispatcher" : "Update Dispatcher"}
            </Button>
            <Button onClick={handleCancel}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
