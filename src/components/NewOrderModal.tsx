import {
  Modal,
  Button,
  DatePicker,
  Input,
  Select,
  Form as AntForm,
  App,
  Row,
  Col
} from "antd";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { createOrder } from "../utils/dbUtils";
import type { Order } from "../types/order";
import type { Customer } from "../types/customer";
import areaData from "../hong_kong_areas.json"

type OrderTime = "Morning" | "Afternoon" | "Evening";

interface OrderFormValues {
  date: dayjs.Dayjs;
  detailedAddress: string;
  area: string;
  district: string;
  deliveryTime: string;
  latitude: number;
  longitude: number;
  customerId: number;
}

export default function NewOrderModal({
  date,
  customers,
  fetchOrders,
}: {
  date?: dayjs.Dayjs;
  customers: Customer[];
  fetchOrders: () => void;
}) {
  type Area = keyof typeof areaData;
  
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  const areas = Object.keys(areaData);
  const districts = selectedArea ? Object.keys(areaData[selectedArea]) : [];

  const [open, setOpen] = useState(false);
  const [form] = AntForm.useForm<OrderFormValues>();
  const { message } = App.useApp();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        date: date,
      });
    }
  }, [open, date, form]);

  const handleSubmit = async (values: OrderFormValues) => {
    const time: OrderTime = values.deliveryTime as OrderTime;
    const newOrder: Omit<Order, "id"> = {
      date: values.date.format("YYYY-MM-DD"),
      time: time,
      status: "Pending",
      detailedAddress: values.detailedAddress,
      area: values.area,
      district: values.district,
      lat: values.latitude,
      lng: values.longitude,
      customerId: values.customerId
    };

    const result = await createOrder(newOrder);

    if (result.success && result.data) {
      setSelectedArea(null);
      handleCancel();
      fetchOrders();
      message.success("Order created successfully!");
    } else {
      console.error("Failed to create order:", result.error);
      message.error(`Failed to create order: ${result.error}`);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedArea(null);
    setOpen(false);
  };

  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>
        Add a new order
      </Button>
      <Modal
        title="New order form"
        open={open}
        onCancel={handleCancel}
        footer={null}
      >
        <AntForm form={form} layout="vertical" onFinish={handleSubmit}>
          <AntForm.Item
            label="Date Picker"
            name="date"
            rules={[{ required: true, message: "Please select a date!" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </AntForm.Item>
          <AntForm.Item
            label="Customer"
            name="customerId"
            rules={[{ required: true, message: "Please select customer!" }]}
          >
            <Select
              placeholder="Select customer"
              onChange={(value) => {
                const selectedCustomer = customers.find(
                  (customer) => customer.id === value
                );
                if (selectedCustomer) {
                  form.setFieldsValue({
                    detailedAddress: selectedCustomer.detailedAddress,
                    area: selectedCustomer.area,
                    district: selectedCustomer.district,
                    longitude: selectedCustomer.lng,
                    latitude: selectedCustomer.lat,
                  });
                  setSelectedArea(selectedCustomer.area as Area);
                }
              }}
            >
              {customers?.map((customer) => (
                <Select.Option key={customer.id} value={customer.id}>
                  {customer.name}
                </Select.Option>
              ))}
            </Select>
          </AntForm.Item>
          <Row gutter={20}>
            <Col span={10}>
              <AntForm.Item
                label="Area"
                name="area"
                rules={[{ required: true, message: "Please select an area!" }]}
              >
                <Select
                  placeholder="Select Area"
                  onChange={(value) => {
                    setSelectedArea(value);
                    form.setFieldsValue({
                      district: undefined,
                    });
                  }}
                >
                  {areas.map((area) => (
                    <Select.Option key={area} value={area}>
                      {area}
                    </Select.Option>
                  ))}
                </Select>
              </AntForm.Item>
            </Col>
            <Col span={10}>
              <AntForm.Item
                label="District"
                name="district"
                rules={[
                  { required: true, message: "Please select a district!" },
                ]}
              >
                <Select
                  placeholder="Select District"
                  disabled={!selectedArea}
                >
                  {districts.map((district) => (
                    <Select.Option key={district} value={district}>
                      {district}
                    </Select.Option>
                  ))}
                </Select>
              </AntForm.Item>
            </Col>
          </Row>
          <AntForm.Item
            label="Detailed Address"
            name="detailedAddress"
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
            label="Longitude"
            name="longitude"
            rules={[
              {
                required: true,
                message: "Please input the longitude of the order!",
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
                message: "Please input the latitude of the order!",
              },
            ]}
          >
            <Input placeholder="Latitude" />
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