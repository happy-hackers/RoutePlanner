import { Modal, Button, Input, Form as AntForm, TimePicker } from "antd";
import dayjs from "dayjs";
import { createCustomer } from "../utils/dbUtils";
import type { Customer } from "../types/customer";

interface CustomerFormValues {
  name: string;
  openTime: dayjs.Dayjs;
  closeTime: dayjs.Dayjs;
  address: string;
  postcode: number;
  latitude: number;
  longitude: number;
}

type Props = {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function NewCustomerModal({
  isVisible,
  onConfirm,
  onCancel,
}: Props) {
  const [form] = AntForm.useForm<CustomerFormValues>();

  const handleSubmit = async (values: CustomerFormValues) => {
    //const location = await getLocationByAddress(values.address);
    if (!values.latitude || !values.longitude) {
      // Give a error message to user: Please enter a valid address!
      return;
    } else {
      console.log("name:", values.name)
      const newCustomer: Omit<Customer, "id"> = {
        name: values.name,
        openTime: values.openTime.format("HH:mm:ss"),
        closeTime: values.closeTime.format("HH:mm:ss"),
        address: values.address,
        lat: values.latitude,
        lng: values.longitude,
        postcode: values.postcode,
      };

      const result = await createCustomer(newCustomer);

      if (result.success && result.data) {
        onConfirm();
        alert("Customer created successfully!");
      } else {
        console.error("Failed to create customer:", result.error);
        alert(`Failed to create customer: ${result.error}`);
      }
    }
  };

  return (
    <>
      <Modal
        title="New customer form"
        open={isVisible}
        onCancel={onCancel}
        footer={null}
      >
        <AntForm form={form} layout="vertical" onFinish={handleSubmit}>
          <AntForm.Item
            label="Name"
            name="name"
            rules={[
              {
                required: true,
                message: "Please input the name of the customer!",
              },
            ]}
          >
            <Input placeholder="Address" />
          </AntForm.Item>
          <AntForm.Item
            label="Open Time"
            name="openTime"
            rules={[{ required: true, message: "Please select a time!" }]}
          >
            <TimePicker style={{ width: "100%" }} />
          </AntForm.Item>
          <AntForm.Item
            label="Close Time"
            name="closeTime"
            rules={[{ required: true, message: "Please select a time!" }]}
          >
            <TimePicker style={{ width: "100%" }} />
          </AntForm.Item>
          <AntForm.Item
            label="Address"
            name="address"
            rules={[
              {
                required: true,
                message: "Please input the address of the customer!",
              },
            ]}
          >
            <Input placeholder="Address" />
          </AntForm.Item>
          <AntForm.Item
            label="Longitude"
            name="longitude"
            rules={[
              {
                required: true,
                message: "Please input the longitude of the customer!",
              },
            ]}
          >
            <Input placeholder="Longitude" />
          </AntForm.Item>
          <AntForm.Item
            label="Latitude"
            name="latitude"
            rules={[
              {
                required: true,
                message: "Please input the latitude of the customer!",
              },
            ]}
          >
            <Input placeholder="Latitude" />
          </AntForm.Item>
          <AntForm.Item
            label="Postcode"
            name="postcode"
            rules={[
              {
                required: true,
                message: "Please input the postcode of the customer!",
              },
            ]}
          >
            <Input placeholder="Postcode" />
          </AntForm.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={onCancel} style={{ marginRight: 8 }}>
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
