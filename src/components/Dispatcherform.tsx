import { Card, Space, Table, Tag, Typography } from "antd";
import type { Order } from "../types/order";
import type { Dispatcher } from "../types/dispatchers";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

const { Title, Text } = Typography;

const REGION_COLORS: Record<string, string> = {
  "Hong Kong Island": "red",
  "Kowloon": "blue",
  "New Territories": "orange"
};

interface DispatcherformProps {
  selectedDispatcher: Dispatcher | null;
  orders: Order[];
  dispatchers: Dispatcher[];
}

interface TableDataType {
  key: React.Key;
  id: number;
  address: string;
  dispatcher?: string;
}

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 40,
  },
  {
    title: "Address",
    dataIndex: "address",
    key: "address",
    ellipsis: true,
    width: 200,
  },
  {
    title: "Dispatcher",
    dataIndex: "dispatcher",
    key: "dispatcher",
    width: 60,
    render: (dispatcher: string) => dispatcher || "Not Assigned",
  },
];

export default function Dispatcherform({
  selectedDispatcher,
  orders,
  dispatchers,
}: DispatcherformProps) {
  // get global time information from redux
  const date = useSelector((state: RootState) => state.order.date);
  const timePeriod = useSelector((state: RootState) => state.order.timePeriod);

  // Filter orders for the selected dispatcher
  const dispatcherOrders = selectedDispatcher
    ? orders.filter((order) => order.dispatcherId === selectedDispatcher.id)
    : [];

  // create a map of dispatcher id to name
  const dispatcherMap = new Map(
    dispatchers.map((dispatcher) => [dispatcher.id, dispatcher.name])
  );

  // Transform orders data for table
  const tableData: TableDataType[] = dispatcherOrders.map((order) => ({
    key: order.id,
    id: order.id,
    address: `${order.detailedAddress}, ${order.area}`,
    dispatcher: order.dispatcherId
      ? dispatcherMap.get(order.dispatcherId)
      : undefined,
  }));

  // Transform all orders data for table (when no dispatcher is selected)
  const allOrdersData: TableDataType[] = orders
    .map((order) => ({
      key: order.id,
      id: order.id,
      address: `${order.detailedAddress}, ${order.area}`,
      dispatcher: order.dispatcherId
        ? dispatcherMap.get(order.dispatcherId)
        : undefined,
    }))
    .sort((a, b) => {
      // order by name
      const dispatcherA = a.dispatcher || "ZZZ"; // not assigned orders at the end
      const dispatcherB = b.dispatcher || "ZZZ";

      if (dispatcherA !== dispatcherB) {
        return dispatcherA.localeCompare(dispatcherB);
      }

      // if dispatcher is the same, order by id
      return a.id - b.id;
    });

  return (
    <Card style={{ maxWidth: 800, margin: "24px auto" }} bordered>
      {selectedDispatcher ? (
        <>
          <Title level={4}>Orders assigned to {selectedDispatcher.name}</Title>
          <Space direction="vertical" style={{ marginBottom: 16 }}>
            <Text>
              <strong>Responsible areas:</strong>
              <br />
              <Space size={[0, 8]} wrap style={{ marginTop: 4 }}>
                {Object.entries(
                  selectedDispatcher.responsibleArea.reduce(
                    (acc: Record<string, string[]>, [region, district]) => {
                      if (!acc[region]) acc[region] = [];
                      acc[region].push(district);
                      return acc;
                    },
                    {}
                  )
                ).map(([region, districts]) => (
                  <Tag key={region} color={REGION_COLORS[region]}>
                    <strong>{region}</strong>: {districts.join(", ")}
                  </Tag>
                ))}
              </Space>
            </Text>

            <Text type="secondary">
              Total orders: {dispatcherOrders.length}
            </Text>
          </Space>
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} orders`,
            }}
            scroll={{ x: 580 }}
          />
        </>
      ) : (
        <>
          <Title level={4}>All Orders</Title>
          <Text type="secondary">
            Select a dispatcher to view their assigned orders
          </Text>
          <p style={{ marginTop: 8 }}>
            <Text strong>Current Time Period:  </Text>
            <Text type="secondary">{date?.format("YYYY-MM-DD")}  </Text>
            {timePeriod.map((period) => (
              <Tag
                key={period}
                color={
                  period === "Morning"
                    ? "gold"
                    : period === "Afternoon"
                    ? "cyan"
                    : "purple"
                }
                style={{ textTransform: "capitalize" }}
              >
                {period}
              </Tag>
            ))}
          </p>
          <Table
            columns={columns}
            dataSource={allOrdersData}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} orders`,
            }}
            scroll={{ x: 580 }}
          />
        </>
      )}
    </Card>
  );
}
