import { useLocation } from "react-router-dom";
import { Table, Typography } from "antd";

const { Title } = Typography;

interface RouteData {
  key: string;
  orderId: string;
  address: string;
  estimatedTime: string;
}

const mockData: Record<string, RouteData[]> = {
  dispatcher1: [
    {
      key: "1",
      orderId: "ORD001",
      address: "123 Main St",
      estimatedTime: "14:30",
    },
    {
      key: "2",
      orderId: "ORD002",
      address: "456 Oak Ave",
      estimatedTime: "15:00",
    },
  ],
  dispatcher2: [
    {
      key: "1",
      orderId: "ORD003",
      address: "789 Pine Rd",
      estimatedTime: "14:45",
    },
    {
      key: "2",
      orderId: "ORD004",
      address: "321 Elm St",
      estimatedTime: "15:15",
    },
  ],
  dispatcher3: [
    {
      key: "1",
      orderId: "ORD005",
      address: "654 Maple Dr",
      estimatedTime: "15:00",
    },
    {
      key: "2",
      orderId: "ORD006",
      address: "987 Cedar Ln",
      estimatedTime: "15:30",
    },
  ],
};

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
  const location = useLocation();
  const dispatcherId = location.hash.replace("#", "");

  if (!dispatcherId) {
    return (
      <div>
        <Title level={4}>Please select a dispatcher from the sidebar</Title>
      </div>
    );
  }

  const data = mockData[dispatcherId] || [];

  return <Table columns={columns} dataSource={data} pagination={false} />;
}

RouteResults.needMap = true;
