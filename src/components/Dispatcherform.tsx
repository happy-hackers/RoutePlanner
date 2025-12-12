import { App, Card, Select, Space, Table, Tag, Typography } from "antd";
import type { Order } from "../types/order";
import type { Dispatcher } from "../types/dispatchers";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { updateOrder } from "../utils/dbUtils";
import { setSelectedOrders } from "../store/orderSlice";
import type { MarkerData } from "../types/markers";
import { useTranslation } from "react-i18next";
import { getGroupedMarkers } from "../utils/markersUtils";

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
  const { t } = useTranslation("viewDispatcher");
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
          order.id === updatedOrder.id ? { ...updatedOrder, customer } : order
        );
        dispatch(setSelectedOrders(newOrders));
        const markers = getGroupedMarkers(newOrders, dispatchers);

        setMarkers(markers);
        message.success(t('message_unassigned_success', { orderId: order.id }));
      } else {
        message.error(t('message_update_failed', { orderId: order.id, error: result.error }));
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
          order.id === updatedOrder.id ? { ...updatedOrder, customer } : order
        );
        dispatch(setSelectedOrders(newOrders));
        let newMarkers;
        if (selectedDispatcher) {
          const newOrderData = newOrders.filter(order => order.dispatcherId === selectedDispatcher.id);
          newMarkers = getGroupedMarkers(newOrderData, dispatchers);
        } else {
          newMarkers = getGroupedMarkers(newOrders, dispatchers);
        }
        setMarkers(newMarkers);
        message.success(t('message_assigned_success', { orderId: order.id, dispatcherName: name || t('dispatcher_unknown') }));
      } else {
        message.error(t('message_update_failed', { orderId: order.id, error: result.error }));
      }
    }
  };

  const sortedDispatchers = [...dispatchers].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const options = [
    { value: -1, label: t("dispatcher_not_assigned") },
    ...sortedDispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  const WIDE_DROPDOWN_CLASS = "local-wide-select-dropdown";

  const columns = [
    {
      title: t("table_id"),
      dataIndex: "id",
      key: "id",
      width: "20%",
      sorter: (a: Order, b: Order) => {
        return a.id - b.id;
      },
      sortDirections: ["ascend", "descend"] as unknown as ("ascend" | "descend" | null)[],
    },
    {
      title: t("table_address"),
      dataIndex: "detailedAddress",
      key: "detailedAddress",
      ellipsis: true,
      width: "60%",
      sorter: (a: Order, b: Order) =>
        a.detailedAddress.localeCompare(b.detailedAddress),
      sortDirections: ["ascend", "descend"] as unknown as ("ascend" | "descend" | null)[],
      render: (detailedAddress: string, record: Order) => (
        <Text>
          {detailedAddress}, {record.area}
        </Text>
      ),
    },
    {
      title: t("table_dispatcher"),
      dataIndex: "dispatcherId",
      key: "dispatcherId",
      width: "20%",
      sorter: (a: Order, b: Order) => {
        const nameA =
          dispatchers.find((d) => d.id === a.dispatcherId)?.name || t("dispatcher_not_assigned");
        const nameB =
          dispatchers.find((d) => d.id === b.dispatcherId)?.name || t("dispatcher_not_assigned");
        return nameA.localeCompare(nameB);
      },
      sortDirections: ["ascend", "descend"] as unknown as ("ascend" | "descend" | null)[],
      render: (dispatcherId: number | undefined, record: Order) => {
        const value = dispatcherId ?? null;
        return (
          <Select
            style={{ width: "100%" }}
            value={value ?? -1}
            onChange={(value) => {
              const label = options.find((opt) => opt.value === value)?.label;
              handleChange(value, label, record);
            }}
            options={options}
            rootClassName={WIDE_DROPDOWN_CLASS}
            virtual={true}
            listHeight={300}
          />
        );
      },
    },
  ];

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
          <Title level={4}>
            {t("title_assigned_orders", { dispatcherName: selectedDispatcher.name })}
          </Title>
          <Space direction="vertical" style={{ marginBottom: 16 }}>
            <Text>
              <strong>{t("text_responsible_areas")}</strong>
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
              {t("text_total_orders", { count: dispatcherOrders.length })}
            </Text>
          </Space>
          <Table
            columns={columns}
            dataSource={dispatcherOrders}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                t("pagination_total_orders", { start: range[0], end: range[1], total }),
            }}
            scroll={{ y: "calc(100vh - 380px)" }}
            onRow={(record) => ({
              onMouseEnter: () => setHoveredOrderId(record.id),
              onMouseLeave: () => setHoveredOrderId(null),
            })}
          />
        </>
      ) : (
        <>
          <Title level={4}>{t("title_all_orders")}</Title>
          <Text type="secondary">
            {t("text_select_dispatcher")}
          </Text>
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                t("pagination_total_orders", { start: range[0], end: range[1], total }),
            }}
            scroll={{ y: "calc(100vh - 280px)" }}
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