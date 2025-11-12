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
  App,
} from "antd";
import type { Order } from "../types/order.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MarkerData } from "../types/markers.ts";
import type { Dispatcher } from "../types/dispatchers";
import OpenStreetMap from "../components/OpenStreetMap";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/index.ts";
import {
  addMarkerwithColor,
  generateDispatcherColorsMap,
  getGroupedMarkers,
} from "../utils/markersUtils.ts";
import type { Route } from "../types/route.ts";
import type { ColumnsType } from "antd/es/table/index";
import { addRoute, getAllRoutes, updateRouteIsActive } from "../utils/dbUtils.ts";
import { setSelectedOrders } from "../store/orderSlice.ts";

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
  const dispatch = useDispatch();
  const { message } = App.useApp();
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [newRoutes, setNewRoutes] = useState<Omit<Route, "id">[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [isAllRoutes, setIsAllRoutes] = useState<boolean>(false);

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

  console.log("markers", markers)

  console.log("all routes", allRoutes)

  const DISPATCHER_COLORS_MAP = generateDispatcherColorsMap(dispatchers);

  const dispatchersOption = [
    { value: null, label: "Please select dispatcher" },
    { value: -1, label: "All Routes" },
    ...dispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  const data = useMemo(
    () =>
      selectedOrders.filter(
        (order) => order.dispatcherId === selectedDispatcher?.id
      ),
    [selectedOrders, selectedDispatcher]
  );

  const fetchRoutes = async () => {
    const routesData = await getAllRoutes();
    if (routesData) {
      setAllRoutes(routesData);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  // Select all order at the beginning
  useEffect(() => {
    if (selectedDispatcher && !isAllRoutes) {
      if (newRoutes.length > 0) {
        const routedDispatcherIds = newRoutes.map((r) => r.dispatcherId);
        const filteredOrders = data.filter(
          (order) =>
            order.dispatcherId !== undefined &&
            !routedDispatcherIds.includes(order.dispatcherId)
        );
        const ids = filteredOrders.map((order) => order.id);
        const newMarkers = getGroupedMarkers(filteredOrders, dispatchers)
        setMarkers(newMarkers);
        setSelectedRowIds(ids);
      } else {
        const allIds = data.map((order) => order.id);
        const newMarkers = getGroupedMarkers(data, dispatchers)
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
      if (newRoutes.length > 0) {
        const routedDispatcherIds = newRoutes.map((r) => r.dispatcherId);
        const filteredOrders = selectedOrders.filter(
          (order) =>
            order.dispatcherId !== undefined &&
            !routedDispatcherIds.includes(order.dispatcherId)
        );
        const ids = filteredOrders.map((order) => order.id);
        const newMarkers = getGroupedMarkers(filteredOrders, dispatchers)
        setMarkers(newMarkers);
        setSelectedRowIds(ids);
      } else {
        const allIds = selectedOrders.map((o) => o.id);
        const allMarkers = getGroupedMarkers(selectedOrders, dispatchers)
        setMarkers(allMarkers);
        setSelectedRowIds(allIds);
      }
    }
  }, [isAllRoutes, selectedOrders, dispatchers]);

  if (selectedOrders.length === 0) {
    return (
      <div>
        <Title level={4}>No orders found</Title>
      </div>
    );
  }

  const handleRowSelect = (record: Order, selected: boolean) => {
    if (selected) {
      setSelectedRowIds((prev) => [...prev, record.id]);
      setMarkers((prevMarkers) => {
        
        const existingMarkerIndex = prevMarkers.findIndex(
          (marker) =>
            marker.position.lat === record.lat &&
            marker.position.lng === record.lng &&
            marker.dispatcherId == record.dispatcherId
        );

        if (existingMarkerIndex !== -1) {
          
          const updatedMarkers = [...prevMarkers];
          const existingMarker = updatedMarkers[existingMarkerIndex];

          if (!existingMarker.meters.some((o) => o.id === record.id)) {
            existingMarker.meters.push(record);
          }
          return updatedMarkers;
        } else {
          const newMarker = addMarkerwithColor(record, dispatchers);
          return [...prevMarkers, newMarker];
        }
      });
    } else {
      setSelectedRowIds(selectedRowIds.filter((id) => id !== record.id));
      setMarkers((prevMarkers) => {
        return prevMarkers.reduce<MarkerData[]>((acc, marker) => {
          const updatedMeters = marker.meters.filter((o) => o.id !== record.id);

          // If no meters left, marker is removed, otherwise, update it
          if (updatedMeters.length > 0) {
            acc.push({ ...marker, meters: updatedMeters });
          }
          return acc;
        }, []);
      });
    }
  };

  const handleAllRowSelect = (
    selected: boolean,
    _selectedRows: Order[],
    changeRows: Order[]
  ) => {
    if (selected) {
      setSelectedRowIds((prev) => [...prev, ...changeRows.map((r) => r.id)]);

      setMarkers((prevMarkers) => {
        const updatedMarkers = [...prevMarkers];

        changeRows.forEach((record) => {
          const existingIndex = updatedMarkers.findIndex(
            (marker) =>
              marker.position.lat === record.lat &&
              marker.position.lng === record.lng &&
              marker.dispatcherId == record.dispatcherId
          );

          if (existingIndex !== -1) {
            const marker = updatedMarkers[existingIndex];
            const alreadyExists = marker.meters.some((o) => o.id === record.id);
            if (!alreadyExists) {
              marker.meters.push(record);
            }
          } else {
            const newMarker = addMarkerwithColor(record, dispatchers);
            updatedMarkers.push(newMarker);
          }
        });

        return updatedMarkers;
      });
    } else {
      setSelectedRowIds((prev) =>
        prev.filter((id) => !changeRows.some((row) => row.id === id))
      );

      setMarkers((prevMarkers) => {
        return prevMarkers.reduce<MarkerData[]>((acc, marker) => {
          const updatedMeters = marker.meters.filter(
            (order) => !changeRows.some((row) => row.id === order.id)
          );
          // If no meters left, marker is removed, otherwise, update it
          if (updatedMeters.length > 0) {
            acc.push({ ...marker, meters: updatedMeters });
          }
          return acc;
        }, []);
      });
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
      const route = newRoutes.find((r) => r.dispatcherId === dispatcher.id);
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
                    {route.addressMeterSequence.length} Waypoints
                  </Text>
                  <Button
                    danger
                    size="small"
                    type="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      const filteredOrders = selectedOrders.filter(
                        (o) => o.dispatcherId === dispatcher.id
                      );
                      const newSelectedIds = filteredOrders.map((o) => o.id);
                      const newMarker = getGroupedMarkers(filteredOrders, dispatchers);
                      setNewRoutes((prev) =>
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
                    onClick={(e) => {
                      e.stopPropagation();
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
            dataSource={route.addressMeterSequence.map((o) => o.address)}
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
    ? newRoutes.find((r) => r.dispatcherId === selectedDispatcher.id)
    : null;

  const saveRoutes = async () => {
    let allSuccess = true;
    let errorMsg = "";

    for (const nr of newRoutes) {
      const matchedRoutes = allRoutes.filter(
        (r) =>
          r.dispatcherId === nr.dispatcherId && r.routeDate === nr.routeDate
      );

      try {
        if (matchedRoutes.length > 0) {
          const highestVersionRoute = matchedRoutes.reduce((prev, curr) =>
            curr.version > prev.version ? curr : prev
          );

          // update the route active state to false locally
          setAllRoutes((prevRoutes) =>
            prevRoutes.map((route) =>
              route.id === highestVersionRoute.id
                ? { ...route, is_active: false }
                : route
            )
          );

          // update the route in database (update first then add because table only allow one active route of the same dispatcher in same date)
          await updateRouteIsActive(false, highestVersionRoute.id);

          // add new route with incremented version
          const newRouteWithVersion: Omit<Route, "id"> = {
            ...nr,
            version: highestVersionRoute.version + 1,
          };
          const result = await addRoute(newRouteWithVersion);

          if (result.success) {
            const newRouteWithId = result.data?.[0];
            if (newRouteWithId)
              setAllRoutes((prev) => [...prev, newRouteWithId]);
          } else {
            allSuccess = false;
            errorMsg = result.error || "Failed to save a route.";
          }
        } else {
          const result = await addRoute(nr);
          if (result.success) {
            const newRouteWithId = result.data?.[0];
            if (newRouteWithId)
              setAllRoutes((prev) => [...prev, newRouteWithId]);
          } else {
            allSuccess = false;
            errorMsg = result.error || "Failed to save a route.";
          }
        }
      } catch (err: any) {
        allSuccess = false;
        errorMsg = err.message || "An unexpected error occurred.";
      }
    }

    if (allSuccess) {
      message.success(
        "All routes have been saved successfully and are active now."
      );
      setNewRoutes([]);
      dispatch(setSelectedOrders([]));
    } else {
      message.error(errorMsg);
    }
  };

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
              <Row justify="space-between" align="middle">
                <Col>
                  <Button type="primary" onClick={saveRoutes}>
                    Confirm & Save the Route
                  </Button>
                </Col>
              </Row>
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
                dataSource={foundRoute.addressMeterSequence.map((o, index) => ({
                  order: index + 1,
                  address: o.address,
                  travelTime: foundRoute.segmentTimes[index],
                }))}
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
      <Col xs={24} sm={24} md={24} lg={16} style={{ height: "100%" }}>
        <OpenStreetMap
          orderMarkers={markers}
          setOrderMarkers={setMarkers}
          setSelectedRowId={setSelectedRowIds}
          isRouteResultsPage={true}
          newRoutes={newRoutes}
          setNewRoutes={setNewRoutes}
          isAllRoutes={isAllRoutes}
          selectedDispatcher={selectedDispatcher}
          ref={mapRef}
        />
      </Col>
    </Row>
  );
}

RouteResults.needMap = true;
