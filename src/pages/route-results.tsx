import { useParams } from "react-router-dom";
import { Table, Typography, Row, Col, Space, Button } from "antd";
import NavigationMap from "../components/NavigationMap";
import type { Order } from "../types/order.ts";
import { useEffect, useState } from "react";
import type { MarkerData } from "../types/markers.ts";
import { getAllDispatchers, getAllOrders } from "../utils/dbUtils";
import type { Dispatcher } from "../types/dispatchers";

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
  const [dispatcher, setDispatcher] = useState<Dispatcher | null>(null);
  //setDispatcher(dispatcher);

  const { id } = useParams();
  const name = dispatcher?.name;

  // Fetch dispatchers from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      const [ordersData, dispatchersData] = await Promise.all([
        getAllOrders(),
        getAllDispatchers(),
      ]);
      
      if (dispatchersData) {
        const dispatcher = dispatchersData.find(
          (dispatcher) => dispatcher.id === Number(id)
        );
        if (dispatcher) {
          setDispatcher(dispatcher);
        }
      }
      if (ordersData) {
        setOrders(ordersData);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    return () => {
      setSelectedRowIds([]);
      setMarkers([]);
    };
  }, [id]);

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
          <Button type="primary">Download the route of {name}</Button>
          <Table
            rowKey="id"
            rowSelection={rowSelection}
            columns={columns}
            dataSource={data}
            pagination={false}
          />
        </Space>
      </Col>
      <Col flex="auto">
        <NavigationMap markers={markers} />
      </Col>
    </Row>
  );
}

RouteResults.needMap = true;
