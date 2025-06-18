import {
  Modal,
  Button,
  DatePicker,
  Input,
  Select,
  Form as AntForm,
} from "antd";
import { message } from "antd";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { addOrder } from "../features/orders";
import type { Order } from "../features/orders";

type OrderTime = "Morning" | "Afternoon" | "Evening";

interface OrderFormValues {
  date: dayjs.Dayjs;
  address: string;
  postcode: number;
  deliveryTime: string;
}

export default function NewOrderModal({
  context,
}: {
  context: { Date?: dayjs.Dayjs; Time?: string; Address?: string };
}) {
  const { Date, Time, Address } = context;
  const [open, setOpen] = useState(false);
  const [form] = AntForm.useForm<OrderFormValues>();
  const dispatch = useDispatch();
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

  const handleSubmit = async (values: OrderFormValues) => {
    const location = await getLocationByAddress(values.address);
    if (!location.lat || !location.lng) {
      // Give a error message to user: Please enter a valid address!
      return;
    } else {
      const time: OrderTime = values.deliveryTime as OrderTime;
      const newOrder: Omit<Order, "id"> = {
        date: values.date.format('YYYY-MM-DD'),
        time: time,
        state: "Pending",
        address: values.address,
        lat: location.lat,
        lng: location.lng,
        postcode: values.postcode
      };
      try {
        const response = await fetch('http://localhost:4000/order/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder),
        });
    
        const result = await response.json();
    
        if (response.ok) {
          dispatch(addOrder(result.newOrder)); // update redux state manually
          alert(result.message);
        } else {
          console.error('Server error:', result.error);
        }
      } catch (error) {
        console.error('Network error:', error);
      }
    }
  };

  const getLocationByAddress = async (address: string) => {
    let location: google.maps.LatLng | null = null;
  
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });
  
      if (result.results[0]) {
        location = result.results[0].geometry.location;
        message.success(`Geocode address successfully`);
      } else {
        message.error(`Could not find address: ${address}`);
      }
    } catch (error) {
      message.error(`Address parsing failed: ${address}`);
      console.error("Geocoding error:", error);
    }
    return {lat: location?.lat(), lng: location?.lng()};
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
            <DatePicker style={{ width: "100%" }}  />
          </AntForm.Item>
          <AntForm.Item
            label="Address"
            name="address"
            rules={[{ required: true, message: "Please input address!" }]}
          >
            <Input placeholder="Address" />
          </AntForm.Item>
          <AntForm.Item
            label="Postcode"
            name="postcode"
            rules={[{ required: true, message: "Please input postcode!" }]}
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
