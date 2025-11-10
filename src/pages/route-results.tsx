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
  setMarkersList,
} from "../utils/markersUtils.ts";
import type { Route } from "../types/route.ts";
import type { ColumnsType } from "antd/es/table/index";
import { addRoute, getAllRoutes, updateRouteIsActive } from "../utils/dbUtils.ts";
import { setSelectedOrders } from "../store/orderSlice.ts";
import { useTranslation } from "react-i18next";

export default function RouteResults() {
  const { t } = useTranslation("RouteResultsPage");

  const { Title, Text } = Typography;

  const columns = [
    {
      title: t("table_order_id"),
      dataIndex: "id",
      key: "orderId",
    },
    {
      title: t("table_address"),
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
      title: t("table_address"),
      dataIndex: "address",
      key: "address",
    },
    {
      title: t("table_travel_time"),
      dataIndex: "travelTime",
      key: "travelTime",
      render: (time: number) => {
        let color = "inherit";

        if (time <= 10) color = "green";
        else if (time <= 30) color = "orange";
        else color = "red";

        return <span style={{ color, fontWeight: 600 }}>{time} {t("unit_mins")} </span>;
      },
    },
  ];

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

  console.log("all routes", allRoutes)

  const DISPATCHER_COLORS_MAP = generateDispatcherColorsMap(dispatchers);

  const dispatchersOption = [
    { value: null, label: t("select_placeholder") },
    { value: -1, label: t("option_all_routes") },
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
      if (newRoutes.length > 0) {
        const routedDispatcherIds = newRoutes.map((r) => r.dispatcherId);
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

  if (selectedOrders.length === 0) {
    return (
      <div>
        <Title level={4}>{t("title_no_orders_found")}</Title>
      </div>
    );
  }


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
                    {route.orderSequence.length} {t("text_waypoints")}
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
                      const newMarker = setMarkersList(
                        filteredOrders,
                        dispatchers
                      );
                      setNewRoutes((prev) =>
                        prev.filter((p) => p.dispatcherId !== dispatcher.id)
                      );
                      setSelectedRowIds((prev) => [...prev, ...newSelectedIds]);
                      setMarkers((prev) => [...prev, ...newMarker]);
                    }}
                  >
                    {t("button_clear_route")}
                  </Button>
                </>
              ) : (
                <>
                  <Text type="secondary">{t("text_no_route_found")}</Text>
                  <Button
                    size="small"
                    type="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      mapRef.current?.triggerCalculate(dispatcher.id);
                    }}
                  >
                    {t("button_calculate")}
                  </Button>
                </>
              )}
            </div>
          </div>
        ),
        children: route ? (
          <List
            size="small"
            dataSource={route.orderSequence.map((o) => o.detailedAddress)}
            renderItem={(address, index) => (
              <List.Item style={{ paddingLeft: 8, paddingRight: 8 }}>
                <div style={{ flex: 1, marginRight: 4 }}>
                  <Text strong>#{index + 1}</Text> — {address}
                </div>
                <Text
                  style={{ color: getTimeColor(route.segmentTimes[index]) }}
                >
                  {route.segmentTimes[index]} {t("unit_mins")}
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
            errorMsg = result.error || t("message_error_save_route_failed");
          }
        } else {
          const result = await addRoute(nr);
          if (result.success) {
            const newRouteWithId = result.data?.[0];
            if (newRouteWithId)
              setAllRoutes((prev) => [...prev, newRouteWithId]);
          } else {
            allSuccess = false;
            errorMsg = result.error || t("message_error_save_route_failed");
          }
        }
      } catch (err: any) {
        allSuccess = false;
        errorMsg = err.message || "An unexpected error occurred.";
      }
    }

    if (allSuccess) {
      message.success(t("message_success_all_routes_saved"));
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
            placeholder={t("select_placeholder")}
          />
          {isAllRoutes ? (
            <>
              <Row justify="space-between" align="middle">
                <Col>
                  <Button type="primary" onClick={saveRoutes}>
                    {t("button_confirm_save_route")}
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
                dataSource={foundRoute.orderSequence.map((o, index) => ({
                  order: index + 1,
                  address: o.detailedAddress,
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
              <Title level={4}>{t("title_select_dispatcher")}</Title>
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
