import { Card, Typography, Row, Col, Button, App } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { getAllCustomers, deleteCustomer } from "../utils/dbUtils";
import type { Customer } from "../types/customer.ts";
import CustomerModal from "../components/CustomerModal";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

export default function ViewCustomers() {
  const { t } = useTranslation('viewCustomerPage');
  const { modal, message } = App.useApp();
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
      customers.sort((a, b) => a.id - b.id);
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

  const handleDeleteCustomer = (customer: Customer) => {
    modal.confirm({
      title: t("modal_delete_title"),
      icon: <DeleteOutlined style={{ color: "red" }} />,
      content: (
        <div>
          <p>
            {t("modal_delete_content_main", { name: customer.name })}
          </p>
          <p style={{ color: "red", marginTop: 8 }}>
            <strong>{t("modal_delete_warning_label")}:</strong>{" "}
            {t("modal_delete_warning_text")}
          </p>
        </div>
      ),
      okText: t("button_delete"),
      okType: "danger",
      cancelText: t("button_cancel"),
      onOk: async () => {
        const result = await deleteCustomer(customer.id);
        if (result.success) {
          const messageKey =
            result.orderCount && result.orderCount > 0
              ? "message_success_deleted_with_orders"
              : "message_success_deleted_no_orders";

          message.success(
            t(messageKey, { count: result.orderCount || 0, name: customer.name })
          );
          fetchCustomers();
        } else {
          message.error(t("message_error_delete_failed", { error: result.error }));
        }
      },
    });
  };

  return (
    <Card title={t("card_title")} style={{ maxWidth: "70%", margin: "0 auto" }}>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={2}>
          <Text strong>{t("header_id")}</Text>
        </Col>
        <Col span={4}>
          <Text strong>{t("header_name")}</Text>
        </Col>
        <Col span={8}>
          <Text strong>{t("header_address")}</Text>
        </Col>
        <Col span={3}>
          <Text strong>{t("header_open_time")}</Text>
        </Col>
        <Col span={3}>
          <Text strong>{t("header_close_time")}</Text>
        </Col>
        <Col span={4}>
          <Text strong>{t("header_action")}</Text>
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
              {t("button_edit")}
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteCustomer(customer)}
            >
              {t("button_delete")}
            </Button>
          </Col>
        </Row>
      ))}

      <Row style={{ marginTop: 16 }}>
        <Col>
          <Button type="primary" onClick={handleAddCustomer}>
            {t("button_add_customer")}
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