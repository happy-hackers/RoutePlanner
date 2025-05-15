import { useParams } from "react-router-dom";
import { Table, Typography, Row, Col, Space, Button } from "antd";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

const { Title } = Typography;

const columns = [
  {
    title: "Order ID",
    dataIndex: "orderId",
    key: "orderId",
  },
  {
    title: "Address",
    dataIndex: "address",
    key: "address",
  },
  {
    title: "Estimated Time",
    dataIndex: "estimatedTime",
    key: "estimatedTime",
  },
];

export default function RouteResults() {
  const { id } = useParams();
  const orders = useSelector((state: RootState) => state.orders);
  const dispatchers = useSelector((state: RootState) => state.dispatchers);
  const dispatcher = dispatchers.find(
    (dispatcher) => dispatcher.id === Number(id)
  );
  const name = dispatcher?.name;

  if (!id) {
    return (
      <div>
        <Title level={4}>Please select a dispatcher from the sidebar</Title>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div>
        <Title level={4}>No orders found</Title>
      </div>
    );
  }

  const data = orders.filter((order) => order.dispatcherId === Number(id));

  return (
    <Row style={{ height: "100%" }}>
      <Col>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Button type="primary">Download the route of {name}</Button>
          <Table columns={columns} dataSource={data} pagination={false} />
        </Space>
      </Col>
    </Row>
  );
}

RouteResults.needMap = true;
