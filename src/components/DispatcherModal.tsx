import { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Space,
  message,
} from "antd";
import { addDispatcher, updateDispatchers } from "../utils/dbUtils";
import type { Dispatcher } from "../types/dispatchers";

const { Option } = Select;

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const areas = [
  "Inner Melbourne",
  "Northern Suburbs",
  "Eastern & South-Eastern Suburbs",
  "Western Suburbs",
];

interface DispatcherModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  dispatcher?: Dispatcher; // 如果是编辑模式，传入dispatcher数据
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

  useEffect(() => {
    if (visible) {
      if (mode === "edit" && dispatcher) {
        // 编辑模式：填充现有数据
        form.setFieldsValue({
          name: dispatcher.name,
          activeDay: dispatcher.activeDay,
          responsibleArea: dispatcher.responsibleArea,
        });
      } else {
        // 添加模式：清空表单
        form.resetFields();
      }
    }
  }, [visible, mode, dispatcher, form]);

  const handleSubmit = async (values: {
    name: string;
    activeDay: string[];
    responsibleArea: string[];
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
          <Select
            mode="multiple"
            placeholder="Select areas"
            style={{ width: "100%" }}
          >
            {areas.map((area) => (
              <Option key={area} value={area}>
                {area}
              </Option>
            ))}
          </Select>
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
