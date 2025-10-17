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
    activeDay: string[];
    responsibleArea: string[][];
  }) => {
    try {
      if (mode === "add") {
        const result = await addDispatcher({
          name: values.name,
          activeDay: values.activeDay || [],
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
          activeDay: values.activeDay || [],
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
          activeDay: [],
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
          <Checkbox.Group>
            <Space wrap>
              {days.map((day) => (
                <Checkbox key={day} value={day}>
                  {day}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
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
