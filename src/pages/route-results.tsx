import {
  Select,
  Table,
  Typography,
  Row,
  Col,
  Space,
  Button,
  Collapse,
  type CollapseProps,
  List,
} from "antd";
import type { Order } from "../types/order.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MarkerData } from "../types/markers.ts";
import type { Dispatcher } from "../types/dispatchers";
import OpenStreetMap from "../components/OpenStreetMap";
import { useSelector } from "react-redux";
import type { RootState } from "../store/index.ts";
import {
  addMarkerwithColor,
  generateDispatcherColorsMap,
  setMarkersList,
} from "../utils/markersUtils.ts";
import type { Route } from "../types/route.ts";
import type { ColumnsType } from "antd/es/table/index";

const { Title, Text } = Typography;

const columns = [
  {
    title: "Order ID",
    dataIndex: "id",
    key: "orderId",
  },
  {
    title: "Address",
    dataIndex: "detailedAddress",
    key: "detailedAddress",
    render: (detailedAddress: string, record: Order) => {
      return (
        <span>
          {detailedAddress}, {record.area}
        </span>
      );
    },
  },
];

interface RouteRow {
  order: number;
  address: string;
  travelTime: number;
}

const routeModeColumns: ColumnsType<RouteRow> = [
  {
    title: "",
    dataIndex: "order",
    key: "order",
    width: "10%",
    align: "center",
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
    },
  },
];

export default function RouteResults() {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [isAllRoutes, setIsAllRoutes] = useState<boolean>(false);

  // 这里的Dispatcher并没有被定义，只是去掉redux之后还没有写获取，如何获取可以参考assign-disparture.tsx
  const [selectedDispatcher, setSelectedDispatcher] =
    useState<Dispatcher | null>(null);
  const dispatchers = useSelector(
    (state: RootState) => state.dispatcher.dispatchers
  );
  const selectedOrders = useSelector(
    (state: RootState) => state.order.selectedOrders
  );

  const mapRef = useRef<{ triggerCalculate: (dispatcherId?: number) => void }>(
    null
  );

  const DISPATCHER_COLORS_MAP = generateDispatcherColorsMap(dispatchers);

  const dispatchersOption = [
    { value: null, label: "Please select dispatcher" },
    { value: -1, label: "All Routes" },
    ...dispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  if (selectedOrders.length === 0) {
    return (
      <div>
        <Title level={4}>No orders found</Title>
      </div>
    );
  }

  const data = useMemo(
    () =>
      selectedOrders.filter(
        (order) => order.dispatcherId === selectedDispatcher?.id
      ),
    [selectedOrders, selectedDispatcher]
  );

  // Select all order at the beginning
  useEffect(() => {
    if (selectedDispatcher && !isAllRoutes) {
      if (routes.length > 0) {
        const routedDispatcherIds = routes.map((r) => r.dispatcherId);
        const filteredOrders = data.filter(
          (order) =>
            order.dispatcherId !== undefined &&
            !routedDispatcherIds.includes(order.dispatcherId)
        );
        const ids = filteredOrders.map((order) => order.id);
        const newMarkers = filteredOrders.map((order) =>
          addMarkerwithColor(order, dispatchers)
        );
        setMarkers(newMarkers);
        setSelectedRowIds(ids);
      } else {
        const allIds = data.map((order) => order.id);
        const newMarkers = data.map((order) =>
          addMarkerwithColor(order, dispatchers)
        );
        setMarkers(newMarkers);
        setSelectedRowIds(allIds);
      }
    } else {
      setSelectedRowIds([]);
      setMarkers([]);
    }
  }, [data, dispatchers]);
  // Work for all route option
  useEffect(() => {
    if (isAllRoutes && selectedOrders.length > 0) {
      if (routes.length > 0) {
        const routedDispatcherIds = routes.map((r) => r.dispatcherId);
        const filteredOrders = selectedOrders.filter(
          (order) =>
            order.dispatcherId !== undefined &&
            !routedDispatcherIds.includes(order.dispatcherId)
        );
        const ids = filteredOrders.map((order) => order.id);
        const newMarkers = filteredOrders.map((order) =>
          addMarkerwithColor(order, dispatchers)
        );
        setMarkers(newMarkers);
        setSelectedRowIds(ids);
      } else {
        const allIds = selectedOrders.map((o) => o.id);
        const allMarkers = selectedOrders.map((o) =>
          addMarkerwithColor(o, dispatchers)
        );
        setMarkers(allMarkers);
        setSelectedRowIds(allIds);
      }
    }
  }, [isAllRoutes, selectedOrders, dispatchers]);

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
      const newMarker = addMarkerwithColor(record, dispatchers);
      addMarker(newMarker);
    } else {
      setSelectedRowIds(selectedRowIds.filter((id) => id !== record.id));
      removeMarker(record.id);
    }
  };

  const handleAllRowSelect = (
    selected: boolean,
    _selectedRows: Order[],
    changeRows: Order[]
  ) => {
    if (selected) {
      changeRows.forEach((record) => {
        setSelectedRowIds((prev) => [...prev, record.id]);
        const newMarker = addMarkerwithColor(record, dispatchers);
        addMarker(newMarker);
      });
    } else {
      setSelectedRowIds((prev) =>
        prev.filter((id) => !changeRows.some((row) => row.id === id))
      );

      setMarkers((prev) =>
        prev.filter((marker) => !changeRows.some((row) => row.id === marker.id))
      );
    }
  };
  const rowSelection = {
    selectedRowKeys: selectedRowIds,
    onSelect: handleRowSelect,
    onSelectAll: handleAllRowSelect,
  };

  const allRouteRowSelection = {
    selectedRowKeys: selectedRowIds,
    onSelect: handleRowSelect,
    onSelectAll: handleAllRowSelect,
  };

  const getTimeColor = (time: number) => {
    let color = "inherit";

    if (time <= 10) color = "green";
    else if (time <= 30) color = "orange";
    else color = "red";

    return color;
  };

  const dispatcherItems: CollapseProps["items"] = dispatchers.map(
    (dispatcher) => {
      const route = routes.find((r) => r.dispatcherId === dispatcher.id);
      const data = selectedOrders.filter(
        (order) => order.dispatcherId === dispatcher.id
      );

      return {
        key: String(dispatcher.id),
        label: (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Text
              style={{ color: DISPATCHER_COLORS_MAP[dispatcher.id]?.color }}
              strong
            >
              {dispatcher.name}
            </Text>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {route ? (
                <>
                  <Text type="secondary">
                    {route.waypoints.length} Waypoints
                  </Text>
                  <Button
                    danger
                    size="small"
                    type="primary"
                    onClick={() => {
                      const filteredOrders = selectedOrders.filter(
                        (o) => o.dispatcherId === dispatcher.id
                      );
                      const newSelectedIds = filteredOrders.map((o) => o.id);
                      const newMarker = setMarkersList(
                        filteredOrders,
                        dispatchers
                      );
                      setRoutes((prev) =>
                        prev.filter((p) => p.dispatcherId !== dispatcher.id)
                      );
                      setSelectedRowIds((prev) => [...prev, ...newSelectedIds]);
                      setMarkers((prev) => [...prev, ...newMarker]);
                    }}
                  >
                    Clear Route
                  </Button>
                </>
              ) : (
                <>
                  <Text type="secondary">No route found</Text>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      mapRef.current?.triggerCalculate(dispatcher.id);
                    }}
                  >
                    Calculate
                  </Button>
                </>
              )}
            </div>
          </div>
        ),
        children: route ? (
          <List
            size="small"
            dataSource={route.waypointsAddresses}
            renderItem={(address, index) => (
              <List.Item style={{ paddingLeft: 8, paddingRight: 8 }}>
                <div style={{ flex: 1, marginRight: 4 }}>
                  <Text strong>#{index + 1}</Text> — {address}
                </div>
                <Text
                  style={{ color: getTimeColor(route.segmentTimes[index]) }}
                >
                  {route.segmentTimes[index]} mins
                </Text>
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="id"
            rowSelection={allRouteRowSelection}
            columns={columns}
            dataSource={data}
            pagination={false}
            size="small"
          />
        ),
      };
    }
  );

  const foundRoute = selectedDispatcher
    ? routes.find((r) => r.dispatcherId === selectedDispatcher.id)
    : null;

  return (
    <Row gutter={[16, 16]} style={{ height: "100%" }}>
      <Col xs={24} sm={24} md={24} lg={8}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Select
            value={
              isAllRoutes
                ? -1
                : selectedDispatcher
                ? selectedDispatcher.id
                : null
            }
            onChange={(id) => {
              if (id === -1) {
                setSelectedDispatcher(null);
                setIsAllRoutes(true);
              } else if (id) {
                setIsAllRoutes(false);
                const selected = dispatchers.find((d) => d.id === id);
                setSelectedDispatcher(selected ?? null);
              } else {
                setIsAllRoutes(false);
                setSelectedDispatcher(null);
              }
            }}
            options={dispatchersOption}
            placeholder="Select Dispatcher"
          />
          {isAllRoutes ? (
            <>
              <Collapse
                items={dispatcherItems}
                accordion
                defaultActiveKey={["1"]}
                style={{ background: "#fff", borderRadius: 8 }}
              />
            </>
          ) : selectedDispatcher ? (
            foundRoute ? (
              <Table
                rowKey="id"
                columns={routeModeColumns}
                dataSource={foundRoute.waypointsAddresses.map(
                  (address, index) => ({
                    order: index + 1,
                    address,
                    travelTime: foundRoute.segmentTimes[index],
                  })
                )}
                pagination={false}
                size="small"
              />
            ) : (
              <Table
                rowKey="id"
                rowSelection={rowSelection}
                columns={columns}
                dataSource={data}
                pagination={false}
              />
            )
          ) : (
            <div>
              <Title level={4}>Please select a dispatcher</Title>
            </div>
          )}
        </Space>
      </Col>

      {/* Map Section */}
      <Col xs={24} sm={24} md={24} lg={16} style={{ height: "100vh" }}>
        <OpenStreetMap
          orderMarkers={markers}
          setOrderMarkers={setMarkers}
          setSelectedRowId={setSelectedRowIds}
          isRouteResultsPage={true}
          routes={routes}
          setRoutes={setRoutes}
          isAllRoutes={isAllRoutes}
          selectedDispatcher={selectedDispatcher}
          ref={mapRef}
        />
      </Col>
    </Row>
  );
}

RouteResults.needMap = true;
