import { App, Card, Select, Space, Table, Tag, Typography } from "antd";
import type { Order } from "../types/order";
import type { Dispatcher } from "../types/dispatchers";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { updateOrder } from "../utils/dbUtils";
import { setSelectedOrders } from "../store/orderSlice";
import type { MarkerData } from "../types/markers";
import { setMarkersList } from "../utils/markersUtils";

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
  setMarkers: (markers: MarkerData[]) => void;
  setHoveredOrderId: (id: number | null) => void;
}

export default function Dispatcherform({
  selectedDispatcher,
  orders,
  dispatchers,
  setMarkers,
  setHoveredOrderId
}: DispatcherformProps) {
  // get global time information from redux
  const { message } = App.useApp();
  const dispatch = useDispatch();
  const selectedOrders = useSelector((state: RootState) => state.order.selectedOrders);

  const handleChange = async (
    dispatcherId: number,
    name: string | undefined,
    order: Order
  ) => {
    const { customer, ...rest } = order;
    if (dispatcherId === -1) {
      const updatedOrder: Order = {
        ...rest,
        dispatcherId: undefined,
        status: "Pending",
      };
      const result = await updateOrder(updatedOrder);
      if (result.success) {
        const newOrders = selectedOrders.map((order) =>
          order.id === updatedOrder.id ? {...updatedOrder, customer} : order
        );
        dispatch(setSelectedOrders(newOrders));
        const newMarkers = setMarkersList(newOrders, dispatchers)
        setMarkers(newMarkers);
        message.success(`Order ${order.id} is not assigned`);
      } else {
        message.error(`Failed to update order ${order.id}: ${result.error}`);
      }
    } else {
      const updatedOrder: Order = {
        ...rest,
        dispatcherId,
        status: "In Progress",
      };
      const result = await updateOrder(updatedOrder);
      if (result.success) {
        const newOrders = selectedOrders.map((order) =>
          order.id === updatedOrder.id ? {...updatedOrder, customer} : order
        );
        dispatch(setSelectedOrders(newOrders));
        let newMarkers;
        if (selectedDispatcher) {
          const newOrderData = newOrders.filter(order => order.dispatcherId === selectedDispatcher.id);
          newMarkers = setMarkersList(newOrderData, dispatchers)
        } else {
          newMarkers = setMarkersList(newOrders, dispatchers)
        }
        setMarkers(newMarkers);
        message.success(`Order ${order.id} assigned to ${name || "Unknown"}`);
      } else {
        message.error(`Failed to update order ${order.id}: ${result.error}`);
      }
    }
  };
  const options = [
    { value: -1, label: "Not Assigned" },
    ...dispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: "12%",
    },
    {
      title: "Address",
      dataIndex: "detailedAddress",
      key: "detailedAddress",
      ellipsis: true,
      width: "60%",
      render: (detailedAddress: string, record: Order) => (
        <Text>
          {detailedAddress}, {record.area}
        </Text>
      ),
    },
    {
      title: "Dispatcher",
      dataIndex: "dispatcherId",
      key: "dispatcherId",
      width: "28%",
      render: (dispatcherId: number | undefined, record: Order) => {
        const value = dispatcherId ?? null;
        return (
          <Select
            style={{ width: "100%" }}
            value={value?? -1}
            onChange={(value) => {
              const label = options.find((opt) => opt.value === value)?.label;
              handleChange(value, label, record);
            }}
            options={options}
          />
        );
      },
    },
  ];

  // Filter orders for the selected dispatcher
  const dispatcherOrders = selectedDispatcher
    ? orders.filter((order) => order.dispatcherId === selectedDispatcher.id)
    : [];

  return (
    <Card
      style={{ maxWidth: 650, margin: "24px auto" }}
      styles={{
        body: {
          padding: "12px 16px",
        },
      }}
    >
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
            dataSource={dispatcherOrders}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} orders`,
            }}
            scroll={{ y: 380 }}
            onRow={(record) => ({
              onMouseEnter: () => setHoveredOrderId(record.id),
              onMouseLeave: () => setHoveredOrderId(null),
            })}
          />
        </>
      ) : (
        <>
          <Title level={4}>All Orders</Title>
          <Text type="secondary">
            Select a dispatcher to view their assigned orders
          </Text>
          {/*<p style={{ marginTop: 8 }}>
            <Text strong>Current Time Period: </Text>
            <Text type="secondary">{date?.format("YYYY-MM-DD")} </Text>
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
          </p>*/}
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} orders`,
            }}
            scroll={{ y: 440 }}
            style={{ marginTop: 8 }}
            onRow={(record) => ({
              onMouseEnter: () => setHoveredOrderId(record.id),
              onMouseLeave: () => setHoveredOrderId(null),
            })}
          />
        </>
      )}
    </Card>
  );
}
