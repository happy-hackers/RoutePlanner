import { Select, Table, Typography, Row, Col, Space, Button } from "antd";
import type { Order } from "../types/order.ts";
import { useEffect, useState } from "react";
import type { MarkerData } from "../types/markers.ts";
import { getAllDispatchers, getAllOrders } from "../utils/dbUtils";
import type { Dispatcher } from "../types/dispatchers";
import OpenStreetMap from "../components/OpenStreetMap";

const { Title } = Typography;

const columns = [
  {
    title: "Order ID",
    dataIndex: "id",
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
  const redIcon = {
    url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
    color: "red",
  };
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // 这里的Dispatcher并没有被定义，只是去掉redux之后还没有写获取，如何获取可以参考assign-disparture.tsx
  const [selectedDispatcher, setSelectedDispatcher] =
    useState<Dispatcher | null>(null);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  //setDispatcher(dispatcher);

  const dispatchersOption = [
    { value: null, label: "Please select dispatcher" },
    ...dispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  // Fetch dispatchers from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      const [ordersData, dispatchersData] = await Promise.all([
        getAllOrders(),
        getAllDispatchers(),
      ]);

      if (ordersData) {
        const filteredOrders = ordersData.filter(order => order.state === "In Progress")
        setOrders(filteredOrders);
      }
      if (dispatchersData) {
        setDispatchers(dispatchersData);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    return () => {
      setSelectedRowIds([]);
      setMarkers([]);
    };
  }, [selectedDispatcher]);

  if (orders.length === 0) {
    return (
      <div>
        <Title level={4}>No orders found</Title>
      </div>
    );
  }

  const data = orders.filter(
    (order) => order.dispatcherId === selectedDispatcher?.id
  );

  const addMarker = (marker: MarkerData) => {
    setMarkers((prev) => [...prev, marker]);
  };
  const removeMarker = (id: number) => {
    const newMarkers = markers.filter((marker) => marker.id !== id);
    setMarkers(newMarkers);
  };

  const handleRowSelect = (record: Order, selected: boolean) => {
    if (selected) {
      setSelectedRowIds((prev) => [...prev, record.id]);
      addMarker({
        id: record.id,
        position: { lat: record.lat, lng: record.lng },
        address: record.address,
        icon: redIcon,
        dispatcherId: record.dispatcherId,
      });
    } else {
      setSelectedRowIds(selectedRowIds.filter((id) => id !== record.id));
      removeMarker(record.id);
    }
  };

  const handleAllRowSelect = (selected: boolean, changeRows: Order[]) => {
    if (selected) {
      changeRows.forEach((record) => {
        setSelectedRowIds((prev) => [...prev, record.id]);
        addMarker({
          id: record.id,
          position: { lat: record.lat, lng: record.lng },
          address: record.address,
          icon: redIcon,
          dispatcherId: record.dispatcherId,
        });
      });
    } else {
      setSelectedRowIds([]);
      setMarkers([]);
    }
  };
  const rowSelection = {
    selectedRowKeys: selectedRowIds,
    onSelect: handleRowSelect,
    onSelectAll: handleAllRowSelect,
  };

  return (
    <Row style={{ height: "100%" }}>
      <Col flex="295px">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Select
            defaultValue={null}
            onChange={(id: number) => {
              if (id) {
                const selectedDispatcher = dispatchers.find((d) => d.id === id);
                setSelectedDispatcher(selectedDispatcher ?? null);
              } else {
                setSelectedDispatcher(null);
              }
            }}
            options={dispatchersOption}
          />

          {selectedDispatcher ? (
            <>
              <Button type="primary">
                Download the route of {selectedDispatcher.name}
              </Button>
              <Table
                rowKey="id"
                rowSelection={rowSelection}
                columns={columns}
                dataSource={data}
                pagination={false}
              />
            </>
          ) : (
            <div>
              <Title level={4}>Please select a dispatcher</Title>
            </div>
          )}
        </Space>
      </Col>
      <Col flex="auto">
        <OpenStreetMap orderMarkers={markers} setOrderMarkers={setMarkers} setSelectedRowId={setSelectedRowIds} />
      </Col>
    </Row>
  );
}

RouteResults.needMap = true;
