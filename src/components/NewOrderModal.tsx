import {
  Modal,
  Button,
  DatePicker,
  Input,
  Select,
  Form as AntForm,
  App,
} from "antd";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { createOrder } from "../utils/dbUtils";
import type { Order } from "../types/order";

type OrderTime = "Morning" | "Afternoon" | "Evening";

interface OrderFormValues {
  date: dayjs.Dayjs;
  address: string;
  postcode: number;
  deliveryTime: string;
  latitude: number;
  longitude: number;
}

export default function NewOrderModal({
  context,
  fetchOrders,
}: {
  context: { Date?: dayjs.Dayjs; Time?: string };
  fetchOrders: () => void;
}) {
  const { message } = App.useApp();
  const { Date, Time } = context;
  const [open, setOpen] = useState(false);
  const [form] = AntForm.useForm<OrderFormValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        date: Date,
        deliveryTime: Time,
      });
    }
  }, [open, Date, Time, form]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const toggleModal = () => {
    setOpen(!open);
  };

  const handleSubmit = async (values: OrderFormValues) => {
    // No lat and long
    let latitude = values.latitude;
    let longitude = values.longitude;

    if (!latitude || !longitude) {
      const location = await getLocationByAddress(values.address);
      if (location) {
        latitude = location.lat;
        longitude = location.lng;
      } else {
        message.error("Please enter a valid address or provide coordinates!");
        return;
      }
    }

    const time: OrderTime = values.deliveryTime as OrderTime;
    const localDate = values.date.format("YYYY-MM-DD");
    const newOrder: Omit<Order, "id"> = {
      date: localDate,
      time: time,
      state: "Pending",
      address: values.address,
      lat: latitude,
      lng: longitude,
      postcode: values.postcode,
    };

    const result = await createOrder(newOrder);

    if (result.success && result.data) {
      toggleModal();
      fetchOrders();
      message.success("Order created successfully!");
    } else {
      console.error("Failed to create order:", result.error);
      message.error(`Failed to create order: ${result.error}`);
    }
  };

  const getLocationByAddress = async (address: string) => {
    //get lat and long
    let location: { lat: number; lng: number } | null = null;

    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });

      if (result.results[0]) {
        const lat = result.results[0].geometry.location.lat();
        const lng = result.results[0].geometry.location.lng();
        location = { lat, lng };
        message.success(
          `Geocoded address successfully: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        );
      } else {
        message.error(`Could not find address: ${address}`);
      }
    } catch (error) {
      message.error(`Address parsing failed: ${address}`);
      console.error("Geocoding error:", error);
    }
    return location;
  };

  const handleCancel = () => {
    form.resetFields();
    setOpen(false);
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
        <AntForm form={form} layout="vertical" onFinish={handleSubmit}>
          <AntForm.Item
            label="Date Picker"
            name="date"
            rules={[{ required: true, message: "Please select a date!" }]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </AntForm.Item>
          <AntForm.Item
            label="Address"
            name="address"
            rules={[
              {
                required: true,
                message: "Please input the address of the order!",
              },
            ]}
          >
            <Input placeholder="Address" />
          </AntForm.Item>
          <AntForm.Item
            label="Postcode"
            name="postcode"
            rules={[
              {
                required: true,
                message: "Please input the postcode of the order!",
              },
            ]}
          >
            <Input placeholder="Postcode" />
          </AntForm.Item>
          <AntForm.Item
            label="Delivery Time"
            name="deliveryTime"
            rules={[
              { required: true, message: "Please select delivery time!" },
            ]}
          >
            <Select placeholder="Select delivery time">
              <Select.Option value="Morning">Morning</Select.Option>
              <Select.Option value="Afternoon">Afternoon</Select.Option>
              <Select.Option value="Evening">Evening</Select.Option>
            </Select>
          </AntForm.Item>
          <div
            style={{
              marginBottom: 16,
              padding: 8,
              backgroundColor: "#f5f5f5",
              borderRadius: 4,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
              Coordinates (optional): If not provided, will be automatically
              geocoded from address
            </p>
          </div>
          <AntForm.Item
            label="Longitude"
            name="longitude"
            rules={[
              {
                required: false,
                message: "Please input the longitude of the order!",
              },
            ]}
          >
            <Input placeholder="Longitude (optional)" />
          </AntForm.Item>
          <AntForm.Item
            label="Latitude"
            name="latitude"
            rules={[
              {
                required: false,
                message: "Please input the latitude of the order!",
              },
            ]}
          >
            <Input placeholder="Latitude (optional)" />
          </AntForm.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
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
