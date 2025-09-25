import { useParams } from "react-router-dom";
import { Table, Typography, Row, Col, Space, Button, message } from "antd";
import NavigationMap from "../components/NavigationMap";
import type { Order } from "../types/order.ts";
import { useEffect, useState } from "react";
import type { MarkerData } from "../types/markers.ts";
import { getAllDispatchers, getAllOrders } from "../utils/dbUtils";
import type { Dispatcher } from "../types/dispatchers";
import { addMarkerwithColor } from "../utils/markersUtils";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import dayjs from "dayjs";

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
  const date = useSelector((state: RootState) => state.time.date);
  const timePeriod = useSelector((state: RootState) => state.time.timePeriod);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dispatcher, setDispatcher] = useState<Dispatcher | null>(null);
  const [routeUrl, setRouteUrl] = useState<string>("");

  const { id } = useParams();

  // Fetch orders from Supabase (no dependencies)
  useEffect(() => {
    const fetchOrders = async () => {
      const ordersData = await getAllOrders();
      if (ordersData) {
        const filteredOrders = date
          ? ordersData.filter((order) => {
              const orderDate = dayjs(order.date);
              return orderDate.isSame(date, "day") && order.time === timePeriod;
            })
          : ordersData;
        setOrders(filteredOrders);
      }
    };

    fetchOrders();
  }, [date, timePeriod]);

  // Fetch dispatchers from Supabase (depends on id)
  useEffect(() => {
    const fetchDispatchers = async () => {
      const dispatchersData = await getAllDispatchers();
      if (dispatchersData) {
        const dispatcher = dispatchersData.find(
          (dispatcher) => dispatcher.id === Number(id)
        );
        if (dispatcher) {
          setDispatcher(dispatcher);
        }
      }
    };

    fetchDispatchers();
  }, [id]);

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
      addMarker(addMarkerwithColor(record, "red"));
    } else {
      setSelectedRowIds(selectedRowIds.filter((id) => id !== record.id));
      removeMarker(record.id);
    }
  };

  const handleAllRowSelect = (selected: boolean, changeRows: Order[]) => {
    if (selected) {
      changeRows.forEach((record) => {
        setSelectedRowIds((prev) => [...prev, record.id]);
        addMarker(addMarkerwithColor(record, "red"));
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

  const handleRouteGenerated = (url: string) => {
    setRouteUrl(url);
  };

  const handleDownloadRoute = async () => {
    if (!routeUrl) {
      message.warning(
        "Please generate a route first by clicking Search on the map"
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(routeUrl);
      message.success("Route URL copied to clipboard!");
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = routeUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      message.success("Route URL copied to clipboard!");
    }
  };

  return (
    <Row style={{ height: "100%" }}>
      <Col flex="295px">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Button
            type="primary"
            onClick={handleDownloadRoute}
            disabled={!routeUrl}
          >
            {routeUrl
              ? `Copy Route URL for ${dispatcher?.name || "Dispatcher"}`
              : "Generate Route First"}
          </Button>
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
        <NavigationMap
          markers={markers}
          onRouteGenerated={handleRouteGenerated}
          setMarkers={setMarkers}
        />
      </Col>
    </Row>
  );
}

RouteResults.needMap = true;
