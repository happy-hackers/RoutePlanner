import { useEffect, useState } from "react";
import {
  Modal,
  Form as AntForm,
  Input,
  Button,
  TimePicker,
  App,
  Select,
  Row,
  Col
} from "antd";
import { addCustomer, updateCustomer } from "../utils/dbUtils";
import type { Customer } from "../types/customer.ts";
import dayjs from "dayjs";
import areaData from "../hong_kong_areas.json"

interface CustomerModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  customer?: Customer;
  mode: "add" | "edit";
}

export default function CustomerModal({
  visible,
  onCancel,
  onSuccess,
  customer,
  mode,
}: CustomerModalProps) {
  type Area = keyof typeof areaData;
  
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  const areas = Object.keys(areaData);
  const districts = selectedArea ? Object.keys(areaData[selectedArea]) : [];
  
  const [form] = AntForm.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    if (visible) {
      if (mode === "edit" && customer) {
        console.log("customer", customer)
        // edit mode: fill existing data
        form.setFieldsValue({
          name: customer.name,
          detailedAddress: customer.detailedAddress,
          area: customer.area,
          district: customer.district,
          openTime: dayjs(customer.openTime, "HH:mm:ss"),
          closeTime: dayjs(customer.closeTime, "HH:mm:ss"),
          lat: customer.lat,
          lng: customer.lng,
          postcode: customer.postcode ?? "",
        });
        setSelectedArea(customer.area as Area);
      } else if (mode === "add") {
        form.resetFields(); // add mode: clear form
      }
    }
  }, [visible, mode, customer, form]);

  interface CustomerFormValues {
    name: string;
    openTime: dayjs.Dayjs;
    closeTime: dayjs.Dayjs;
    detailedAddress: string;
    area: string;
    district: string;
    lat: number;
    lng: number;
  }
  const handleSubmit = async (values: CustomerFormValues) => {
    try {
      if (mode === "add") {
        const newCustomer: Omit<Customer, "id"> = {
          name: values.name,
          openTime: values.openTime.format("HH:mm:ss"),
          closeTime: values.closeTime.format("HH:mm:ss"),
          detailedAddress: values.detailedAddress,
          area: values.area,
          district: values.district,
          lat: values.lat,
          lng: values.lng,
        };
        const result = await addCustomer(newCustomer);

        if (result.success && result.data) {
          message.success("Customer created successfully!");
          //message.success("Customer added successfully!");
          onSuccess();
          setSelectedArea(null);
          onCancel();
        } else {
          message.error(`Failed to add customer: ${result.error}`);
        }
      } else if (mode === "edit") {
        if (!customer) return;

        const updatedCustomer: Customer = {
          ...customer,
          name: values.name,
          openTime: values.openTime.format("HH:mm:ss"),
          closeTime: values.closeTime.format("HH:mm:ss"),
          detailedAddress: values.detailedAddress,
          area: values.area,
          district: values.district,
          lat: values.lat,
          lng: values.lng,
        };

        const result = await updateCustomer(updatedCustomer);
        if (result.success) {
          message.success("Customer updated successfully!");
          onSuccess();
          onCancel();
        } else {
          message.error(`Failed to update customer: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      message.error("Network error occurred");
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedArea(null);
    onCancel();
  };

  return (
    <Modal
      title={mode === "add" ? "Add New Customer" : "Edit Customer"}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
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
          <Input placeholder="Name" />
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
                options={areas.map((area) => ({
                    value: area,
                    label: area,
                  }))}
                optionFilterProp="label"
                showSearch
              />
            </AntForm.Item>
          </Col>
          <Col span={10}>
            <AntForm.Item
              label="District"
              name="district"
              rules={[{ required: true, message: "Please select a district!" }]}
            >
              <Select
                placeholder="Select District"
                disabled={!selectedArea}
                options={districts.map((district) => ({
                    value: district,
                    label: district,
                  }))}
                optionFilterProp="label"
                showSearch
              />
            </AntForm.Item>
          </Col>
        </Row>
        <AntForm.Item
          label="Detailed Address"
          name="detailedAddress"
          rules={[
            {
              required: true,
              message: "Please input the detailed address of the customer!",
            },
          ]}
        >
          <Input placeholder="Address" />
        </AntForm.Item>
        <AntForm.Item
          label="Longitude"
          name="lng"
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
          name="lat"
          rules={[
            {
              required: true,
              message: "Please input the latitude of the customer!",
            },
          ]}
        >
          <Input placeholder="Latitude" />
        </AntForm.Item>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit">
            {mode === "add" ? "Add Customer" : "Update Customer"}
          </Button>
        </div>
      </AntForm>
    </Modal>
  );
}
