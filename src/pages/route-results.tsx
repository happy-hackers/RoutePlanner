import { Select, Table, Typography, Row, Col, Space, Button } from "antd";
import type { Order } from "../types/order.ts";
import { useEffect, useState } from "react";
import type { MarkerData } from "../types/markers.ts";
import { getAllDispatchers, getAllOrders } from "../utils/dbUtils";
import type { Dispatcher } from "../types/dispatchers";
import OpenStreetMap from "../components/OpenStreetMap";
import { useSelector } from "react-redux";
import type { RootState } from "../store/index.ts";
import dayjs from "dayjs";
import { ArrowLeftOutlined } from "@ant-design/icons";

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
];

const routeModeColumns = [
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
    title: "Travel Time",
    dataIndex: "travelTime",
    key: "travelTime",
    render: (time: number) => {
      let color = "inherit";

      if (time <= 10) color = "green";
      else if (time <= 30) color = "orange";
      else color = "red";

      return <span style={{ color, fontWeight: 600 }}>{time} mins</span>;
    }
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
  const [isRouteMode, setIsRouteMode] = useState<boolean>(false);
  const [sortedMarkers, setSortedMarkers] = useState<(MarkerData & { travelTime: number })[]>([]);

  // 这里的Dispatcher并没有被定义，只是去掉redux之后还没有写获取，如何获取可以参考assign-disparture.tsx
  const [selectedDispatcher, setSelectedDispatcher] =
    useState<Dispatcher | null>(null);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const date = useSelector((state: RootState) => state.order.date);
  const timePeriod = useSelector((state: RootState) => state.order.timePeriod);

  const dispatchersOption = [
    { value: null, label: "Please select dispatcher" },
    ...dispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  const getFilteredOrders = (ordersData: Order[]): Order[] => {
    let filteredOrders: Order[]
    if (date === null) {
      filteredOrders = ordersData.filter((order) => {
        const isSameTimePeriod = timePeriod.includes(order.time);
        const isInProgress = order.status === "In Progress";
        return isSameTimePeriod && isInProgress;
      })
    } else {
      filteredOrders = ordersData.filter((order) => {
        const orderDate = dayjs(order.date);
        const isSameDate = orderDate.isSame(date, "day");
        const isSameTimePeriod = timePeriod.includes(order.time);
        const isInProgress = order.status === "In Progress";
        return isSameDate && isSameTimePeriod && isInProgress;
      });
    }
    return filteredOrders;
  }

  // Fetch dispatchers from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      const [ordersData, dispatchersData] = await Promise.all([
        getAllOrders(),
        getAllDispatchers(),
      ]);

      if (ordersData) {
        const filteredOrders = getFilteredOrders(ordersData)
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
        customer: record.customer
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
          customer: record.customer
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
      <Col flex="500px">
        {isRouteMode ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Row justify="space-between" align="middle">
              <Col>
                <h3>Sorted Order:</h3>
              </Col>
              <Col>
                <Button
                  type="default"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setIsRouteMode(false)} // example back action
                >
                  Back
                </Button>
              </Col>
            </Row>
            <Table
              rowKey="id"
              columns={routeModeColumns}
              dataSource={sortedMarkers}
              pagination={false}
            />
          </Space>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Select
              defaultValue={null}
              value={selectedDispatcher ? selectedDispatcher.id : null}
              onChange={(id: number) => {
                if (id) {
                  const selectedDispatcher = dispatchers.find(
                    (d) => d.id === id
                  );
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
        )}
      </Col>
      <Col flex="auto">
        <OpenStreetMap
          orderMarkers={markers}
          setOrderMarkers={setMarkers}
          setSelectedRowId={setSelectedRowIds}
          sortedMarkers={sortedMarkers}
          setSortedMarkers={setSortedMarkers}
          setIsRouteMode={setIsRouteMode}
          isRouteMode={isRouteMode}
        />
      </Col>
    </Row>
  );
}

RouteResults.needMap = true;