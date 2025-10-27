import { Card, Typography, Row, Col, Button } from "antd";
import { useEffect, useState } from "react";
import { getAllCustomers } from "../utils/dbUtils";
import type { Customer } from "../types/customer.ts";
import CustomerModal from "../components/CustomerModal";

const { Text } = Typography;

export default function ViewCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedCustomer, setSelectedCustomer] = useState<
    Customer | undefined
  >();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const customers = await getAllCustomers();
    if (customers) {
      customers.sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(customers);
    }
  };

  const handleAddCustomer = () => {
    setModalMode("add");
    setSelectedCustomer(undefined);
    setModalVisible(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setModalMode("edit");
    setSelectedCustomer(customer);
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setSelectedCustomer(undefined);
  };

  const handleModalSuccess = () => {
    fetchCustomers(); // refresh customers
  };

  return (
    <Card title="Customers" style={{ maxWidth: "70%", margin: "0 auto" }}>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={2}>
          <Text strong>ID</Text>
        </Col>
        <Col span={4}>
          <Text strong>Name</Text>
        </Col>
        <Col span={8}>
          <Text strong>Address</Text>
        </Col>
        <Col span={3}>
          <Text strong>Open Time</Text>
        </Col>
        <Col span={3}>
          <Text strong>Close Time</Text>
        </Col>
        <Col span={4}>
          <Text strong>Action</Text>
        </Col>
      </Row>

      {customers.map((customer) => (
        <Row
          key={customer.id}
          align="middle"
          gutter={12}
          style={{
            marginBottom: 12,
            padding: "8px 0",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Col span={2}>
            <Text>{customer.id}</Text>
          </Col>
          <Col span={4}>
            <Text>{customer.name}</Text>
          </Col>
          <Col span={8}>
            <Text>{customer.detailedAddress}, {customer.area}</Text>
          </Col>
          <Col span={3}>
            <Text>{customer.openTime}</Text>
          </Col>
          <Col span={3}>
            <Text>{customer.closeTime}</Text>
          </Col>
          <Col span={4}>
            <Button
              type="link"
              size="small"
              onClick={() => handleEditCustomer(customer)}
            >
              Edit
            </Button>
          </Col>
        </Row>
      ))}

      <Row style={{ marginTop: 16 }}>
        <Col>
          <Button type="primary" onClick={handleAddCustomer}>
            Add Customer
          </Button>
        </Col>
      </Row>

      <CustomerModal
        visible={modalVisible}
        mode={modalMode}
        customer={selectedCustomer}
        onCancel={handleModalCancel}
        onSuccess={handleModalSuccess}
      />
    </Card>
  );
}

ViewCustomers.needMap = false;
