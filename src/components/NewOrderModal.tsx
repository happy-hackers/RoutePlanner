import {
  Modal,
  Button,
  DatePicker,
  Input,
  Select,
  Form as AntForm,
} from "antd";
import { useState, useEffect } from "react";
import dayjs from "dayjs";

export default function NewOrderModal({
  context,
}: {
  context: { Date?: dayjs.Dayjs; Time?: string; Address?: string };
}) {
  const { Date, Time, Address } = context;
  const [open, setOpen] = useState(false);
  const [form] = AntForm.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        date: Date,
        address: Address,
        deliveryTime: Time,
      });
    }
  }, [open, Date, Time, Address, form]);

  const toggleModal = () => {
    setOpen(!open);
  };

  return (
    <>
      <Button type="primary" onClick={toggleModal}>
        Add a new order
      </Button>
      <Modal
        title="New order form"
        open={open}
        onCancel={toggleModal}
        footer={null}
      >
        <AntForm
          form={form}
          layout="vertical"
          onFinish={(values) => {
            console.log("Form values:", values);
            setOpen(false);
          }}
        >
          <AntForm.Item
            label="Date Picker"
            name="date"
            rules={[{ required: true, message: "Please select a date!" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </AntForm.Item>
          <AntForm.Item
            label="Address"
            name="address"
            rules={[{ required: true, message: "Please input address!" }]}
          >
            <Input placeholder="Address" />
          </AntForm.Item>
          <AntForm.Item
            label="Delivery Time"
            name="deliveryTime"
            rules={[
              { required: true, message: "Please select delivery time!" },
            ]}
          >
            <Select placeholder="Select delivery time">
              <Select.Option value="afternoon">Afternoon</Select.Option>
              <Select.Option value="evening">Evening</Select.Option>
            </Select>
          </AntForm.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={toggleModal} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Add
            </Button>
          </div>
        </AntForm>
      </Modal>
    </>
  );
}
