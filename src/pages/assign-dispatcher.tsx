import {
  Select,
  Button,
  Row,
  Col,
  Space,
  App,
  Popconfirm,
  Table,
  Typography,
} from "antd";
import type {
  TablePaginationConfig,
  FilterValue,
  SorterResult,
} from "antd/es/table/interface";
import { useState, useEffect, useMemo, memo, useCallback } from "react";
import type { Dispatcher } from "../types/dispatchers";
import { getAllDispatchers, updateOrder } from "../utils/dbUtils";
import type { MarkerData } from "../types/markers";
import type { Order } from "../types/order";
import { getGroupedMarkers } from "../utils/markersUtils";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { setSelectedOrders } from "../store/orderSlice";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { getDistance } from "../utils/mapUtils";

const { Text } = Typography;

const WIDE_DROPDOWN_CLASS = "local-wide-select-dropdown";

const customStyles = `
  .ant-select-dropdown.${WIDE_DROPDOWN_CLASS} {
    width: 250px !important; 
    min-width: 250px !important;
  }
`;

// Weight for spatial optimization.
// 1km distance is roughly equivalent to adding 0.5 to the load count.
const DISTANCE_WEIGHT = 0.5;

interface GroupRowData {
  groupKey: string;
  address: string;
  orders: Order[];
  dispatcherId: number | null | "mixed";
  dispatcherName: string;
}

type SortOrder = "ascend" | "descend" | null;

const checkMatch = (d: Dispatcher, order: Order) => {
  const orderDayKey = dayjs(order.date).format("ddd").toLowerCase();
  const orderPeriod = order.time;

  // Check location match
  const isDistrictMatch = d.responsibleArea.some(
    ([, dist]) => dist?.toLowerCase() === order.customer?.district.toLowerCase()
  );
  const isAreaMatch = d.responsibleArea.some(
    ([area]) => area?.toLowerCase() === order.customer?.area.toLowerCase()
  );
  const isLocationMatch = isDistrictMatch || isAreaMatch;

  // Check time match
  const activeDays = d.activeDay || {};
  const activePeriods = activeDays[orderDayKey] || [];
  const isTimeMatch = activePeriods.some(
    (p) => p.toLowerCase() === orderPeriod.toLowerCase()
  );

  return { isLocationMatch, isTimeMatch };
};

type OrderPayload = Omit<Order, "customer" | "matchedDispatchers">;

const updateOrderInDb = async (order: Order, dispatcherId: number) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { customer, matchedDispatchers, ...restProps } = order as Order & {
    matchedDispatchers?: unknown;
  };

  const payload: OrderPayload = {
    ...(restProps as unknown as Omit<OrderPayload, "dispatcherId" | "status">),
    dispatcherId: dispatcherId,
    status: "In Progress",
  };

  const result = await updateOrder(payload as Order);

  return {
    result,
    updatedOrder: payload as Order,
    originalCustomer: customer || order.customer,
  };
};

const OrdersSubTable = memo(
  ({
    orders,
    assignmentOptions,
    onAssign,
    setHoveredOrderId,
    t,
  }: {
    orders: Order[];
    assignmentOptions: { value: number; label: string }[];
    onAssign: (order: Order, val: number) => void;
    setHoveredOrderId: (id: number | null) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key: string, options?: any) => string;
  }) => {
    const columns = [
      {
        title: t("table_id"),
        dataIndex: "id",
        width: "35%",
      },
      {
        title: t("table_time"),
        dataIndex: "time",
        width: "40%",
        render: (time: string, order: Order) =>
          `${dayjs(order.date).format("MM-DD")} ${time}`,
      },
      {
        title: t("table_dispatcher"),
        width: "25%",
        render: (_: unknown, order: Order) => (
          <Select
            rootClassName={WIDE_DROPDOWN_CLASS}
            style={{ width: "100%", minWidth: 120 }}
            placeholder={t("status_unassigned")}
            value={order.dispatcherId || null}
            allowClear={false}
            onChange={(value) => onAssign(order, value)}
            options={assignmentOptions}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
    ];

    return (
      <Table
        rowKey="id"
        dataSource={orders}
        pagination={false}
        size="small"
        showHeader={true}
        columns={columns}
        onRow={(record) => ({
          onMouseEnter: () => setHoveredOrderId(record.id),
          onMouseLeave: () => setHoveredOrderId(null),
        })}
      />
    );
  }
);

export default function AssignDispatchers({
  setMarkers,
  setHoveredOrderId,
}: {
  setMarkers: (markers: MarkerData[]) => void;
  hoveredOrderId: number | null;
  setHoveredOrderId: (id: number | null) => void;
}) {
  const { t } = useTranslation("assignDispatcher");
  const { message, modal, notification } = App.useApp();
  const dispatch = useDispatch();
  const selectedOrders = useSelector(
    (state: RootState) => state.order.selectedOrders
  );

  const isEveryOrderAssigned = useMemo(
    () =>
      selectedOrders.every(
        (order) =>
          order.dispatcherId !== null && order.dispatcherId !== undefined
      ),
    [selectedOrders]
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [groupPage, setGroupPage] = useState(1);
  const [groupsPerPage, setGroupsPerPage] = useState(20);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // Fetch dispatchers on mount
  useEffect(() => {
    const fetchDispatchers = async () => {
      try {
        const dispatchersData = await getAllDispatchers();
        if (dispatchersData) {
          setDispatchers(dispatchersData);
        }
      } catch (error) {
        console.error(t("message_error_fetch"), error);
        message.error(t("message_error_load"));
      }
    };

    fetchDispatchers();
  }, [message, t]);

  // Memoized sorted dispatchers and lookups
  const sortedDispatchers = useMemo(() => {
    return [...dispatchers].sort((a, b) => a.name.localeCompare(b.name));
  }, [dispatchers]);

  const dispatcherMap = useMemo(() => {
    return dispatchers.reduce((acc, d) => {
      acc[d.id] = d;
      return acc;
    }, {} as Record<number, Dispatcher>);
  }, [dispatchers]);

  const filterOptions = useMemo(
    () => [
      { value: null, label: t("select_all_dispatchers") },
      ...sortedDispatchers.map((dispatcher) => ({
        value: dispatcher.id,
        label: dispatcher.name,
      })),
    ],
    [sortedDispatchers, t]
  );

  const assignmentOptions = useMemo(
    () =>
      sortedDispatchers.map((dispatcher) => ({
        value: dispatcher.id,
        label: dispatcher.name,
      })),
    [sortedDispatchers]
  );

  const handleSingleAssign = useCallback(
    async (order: Order, dispatcherId: number) => {
      const dispatcher = dispatcherMap[dispatcherId];
      if (!dispatcher) return;

      const { result, updatedOrder, originalCustomer } = await updateOrderInDb(
        order,
        dispatcherId
      );

      if (result.success) {
        const newOrders = selectedOrders.map((o) =>
          o.id === order.id
            ? { ...updatedOrder, customer: originalCustomer }
            : o
        );

        dispatch(setSelectedOrders(newOrders));
        const markers = getGroupedMarkers(newOrders, dispatchers);
        setMarkers(markers);

        message.success(
          t("message_success", {
            orderId: order.id,
            dispatcherName: dispatcher.name,
          })
        );
      } else {
        message.error(
          t("message_error_update", {
            orderId: order.id,
            error: result.error,
          })
        );
      }
    },
    [
      dispatcherMap,
      selectedOrders,
      dispatchers,
      dispatch,
      setMarkers,
      message,
      t,
    ]
  );

  const handleGroupAssign = useCallback(
    async (ordersToAssign: Order[], dispatcherId: number) => {
      const dispatcher = dispatcherMap[dispatcherId];
      if (!dispatcher) return;

      const ordersNeedingUpdate = ordersToAssign.filter(
        (o) => o.dispatcherId !== dispatcherId
      );

      if (ordersNeedingUpdate.length === 0) {
        message.info(t("message_warning_no_change"));
        return;
      }

      const promises = ordersNeedingUpdate.map((order) =>
        updateOrderInDb(order, dispatcherId).then((res) => ({
          ...res,
          orderId: order.id,
        }))
      );

      const results = await Promise.all(promises);

      let successCount = 0;
      let newOrders = [...selectedOrders];
      let hasUpdate = false;

      results.forEach(({ result, updatedOrder, originalCustomer, orderId }) => {
        if (result.success) {
          newOrders = newOrders.map((o) =>
            o.id === orderId
              ? { ...updatedOrder, customer: originalCustomer }
              : o
          );
          successCount++;
          hasUpdate = true;
        }
      });

      if (hasUpdate) {
        dispatch(setSelectedOrders(newOrders));
        const markers = getGroupedMarkers(newOrders, dispatchers);
        setMarkers(markers);
      }

      if (successCount > 0) {
        message.success(
          t("message_success_bulk", {
            count: successCount,
            name: dispatcher.name,
          })
        );
      }
    },
    [
      dispatcherMap,
      selectedOrders,
      dispatchers,
      dispatch,
      setMarkers,
      message,
      t,
    ]
  );

  const assignOrders = async (ordersToProcess: Order[]) => {
    setIsAssigning(true);
    if (dispatchers.length === 0) {
      setIsAssigning(false);
      return;
    }

    const unassignedOrders = ordersToProcess.filter(
      (o) => !o.dispatcherId && o.customer
    );

    if (unassignedOrders.length === 0 && ordersToProcess.length > 0) {
      message.info(t("message_all_assigned_before_click"));
      setIsAssigning(false);
      return;
    }

    // 1. Initialize Load Map and Location Map
    // dispatcherLoadMap: ID -> Set of address strings (for load balancing)
    const dispatcherLoadMap = new Map<number, Set<string>>();
    // dispatcherLocationsMap: ID -> Array of {lat, lng} (for spatial clustering)
    const dispatcherLocationsMap = new Map<
      number,
      { lat: number; lng: number }[]
    >();

    ordersToProcess.forEach((o) => {
      if (o.dispatcherId) {
        // Initialize Load
        const set = dispatcherLoadMap.get(o.dispatcherId) || new Set();
        set.add(o.detailedAddress || String(o.id));
        dispatcherLoadMap.set(o.dispatcherId, set);

        // Initialize Locations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lat = (o as any).lat || (o as any).latitude;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lng = (o as any).lng || (o as any).longitude;

        if (lat && lng) {
          const locs = dispatcherLocationsMap.get(o.dispatcherId) || [];
          locs.push({ lat: Number(lat), lng: Number(lng) });
          dispatcherLocationsMap.set(o.dispatcherId, locs);
        }
      }
    });

    // Helper to update maps in real-time during assignment loop
    const incrementLoadAndLocation = (dId: number, order: Order) => {
      // Update Load
      const address = order.detailedAddress || String(order.id);
      const set = dispatcherLoadMap.get(dId) || new Set();
      set.add(address);
      dispatcherLoadMap.set(dId, set);

      // Update Location
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lat = (order as any).lat || (order as any).latitude;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lng = (order as any).lng || (order as any).longitude;
      if (lat && lng) {
        const locs = dispatcherLocationsMap.get(dId) || [];
        locs.push({ lat: Number(lat), lng: Number(lng) });
        dispatcherLocationsMap.set(dId, locs);
      }
    };

    // Score = Load + (MinDistance * Weight)
    const getBestDispatcherWithSpatial = (
      candidates: Dispatcher[],
      targetOrder: Order
    ) => {
      if (candidates.length === 0) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tLat = (targetOrder as any).lat || (targetOrder as any).latitude;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tLng = (targetOrder as any).lng || (targetOrder as any).longitude;
      const hasTargetLoc = tLat && tLng;

      let bestCandidate = candidates[0];
      let minScore = Infinity;

      // For debugging: Verify if spatial logic is working
      console.groupCollapsed(`Assigning Order ${targetOrder.id}`);

      for (const d of candidates) {
        // Factor 1: Current Load (Unique Addresses)
        const load = dispatcherLoadMap.get(d.id)?.size || 0;

        // Factor 2: Spatial Distance
        let minDistanceKm = 0;
        if (hasTargetLoc) {
          const existingLocs = dispatcherLocationsMap.get(d.id) || [];
          if (existingLocs.length > 0) {
            // Find distance to the NEAREST existing order for this dispatcher
            const minDistanceMeters = Math.min(
              ...existingLocs.map((loc) =>
                getDistance(tLat, tLng, loc.lat, loc.lng)
              )
            );
            minDistanceKm = minDistanceMeters / 1000;
          } else {
            // Dispatcher has no spatial history yet.
            minDistanceKm = 0;
          }
        }

        // Weighted Score
        const score = load + minDistanceKm * DISTANCE_WEIGHT;

        console.debug(`Dispatcher: ${d.name}`, {
          load,
          minDistanceKm: minDistanceKm.toFixed(2),
          score: score.toFixed(2),
        });

        if (score < minScore) {
          minScore = score;
          bestCandidate = d;
        }
      }
      console.groupEnd();
      return bestCandidate;
    };

    // Queue and loop logic
    const assignmentsQueue: {
      order: Order;
      dispatcher: Dispatcher;
      warningReason?: string;
    }[] = [];
    const forcedAssignmentWarnings: string[] = [];

    // 2. Process each unassigned order
    for (const order of unassignedOrders) {
      const addressKey = order.detailedAddress || String(order.id);

      const matches = dispatchers.filter((d) => {
        const { isLocationMatch, isTimeMatch } = checkMatch(d, order);
        return isLocationMatch && isTimeMatch;
      });

      let selectedDispatcher: Dispatcher | null = null;
      let warningReason = "";

      if (matches.length === 1) {
        // Case A: Only one perfect match
        selectedDispatcher = matches[0];
      } else if (matches.length > 1) {
        // Case B: Multiple perfect matches
        // 1. Prioritize Exact Address Match (Distance = 0 essentially)
        const dispatchersAtLocation = matches.filter((d) =>
          dispatcherLoadMap.get(d.id)?.has(addressKey)
        );

        const candidatePool =
          dispatchersAtLocation.length > 0 ? dispatchersAtLocation : matches;

        // 2. Use Spatial + Load scoring
        selectedDispatcher = getBestDispatcherWithSpatial(candidatePool, order);
      } else {
        // Case C: No perfect match (Fallback Strategy)
        let candidates: Dispatcher[] = [];

        // Try Area match (ignore time)
        candidates = dispatchers.filter(
          (d) => checkMatch(d, order).isLocationMatch
        );
        if (candidates.length > 0) {
          warningReason = t("warning_time_mismatch", {
            defaultValue: "Area match only (Time ignored)",
          });
        } else {
          // Try Time match (ignore area)
          candidates = dispatchers.filter(
            (d) => checkMatch(d, order).isTimeMatch
          );
          if (candidates.length > 0) {
            warningReason = t("warning_area_mismatch", {
              defaultValue: "Time match only (Area ignored)",
            });
          } else {
            // Force assign to anyone
            candidates = dispatchers;
            warningReason = t("warning_all_mismatch", {
              defaultValue: "No match (Forced assignment)",
            });
          }
        }
        // Pick best from fallback candidates using Spatial + Load
        selectedDispatcher = getBestDispatcherWithSpatial(candidates, order);
      }

      if (selectedDispatcher) {
        // Update maps immediately so next order in loop considers this assignment
        incrementLoadAndLocation(selectedDispatcher.id, order);
        assignmentsQueue.push({
          order,
          dispatcher: selectedDispatcher,
          warningReason,
        });
      }
    }

    // 3. Execute DB Updates
    const updatePromises = assignmentsQueue.map(
      ({ order, dispatcher, warningReason }) =>
        updateOrderInDb(order, dispatcher.id).then((res) => ({
          ...res,
          orderId: order.id,
          dispatcherName: dispatcher.name,
          warningReason,
        }))
    );

    const results = await Promise.all(updatePromises);

    let successfullyAssignedCount = 0;
    const finalUpdatedOrders = [...ordersToProcess];

    results.forEach(
      ({
        result,
        updatedOrder,
        originalCustomer,
        orderId,
        dispatcherName,
        warningReason,
      }) => {
        if (result.success) {
          const index = finalUpdatedOrders.findIndex((o) => o.id === orderId);
          if (index > -1) {
            finalUpdatedOrders[index] = {
              ...updatedOrder,
              customer: originalCustomer,
            };
            successfullyAssignedCount++;

            if (warningReason) {
              forcedAssignmentWarnings.push(
                `${t("order_id", {
                  defaultValue: "Order",
                })}: ${orderId} -> ${dispatcherName} [${warningReason}]`
              );
            }
          }
        } else {
          message.error(
            t("message_error_update", {
              orderId: orderId,
              error: result.error,
            })
          );
        }
      }
    );

    // 4. Update UI
    dispatch(setSelectedOrders(finalUpdatedOrders));
    const markers = getGroupedMarkers(finalUpdatedOrders, dispatchers);
    setMarkers(markers);
    setIsAssigning(false);

    // 5. Feedback
    if (forcedAssignmentWarnings.length > 0) {
      modal.warning({
        title: t("warning_forced_assignments_title"),
        width: 500,
        content: (
          <div
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              marginTop: "10px",
            }}
          >
            <div style={{ marginBottom: "10px" }}>
              {t("warning_forced_assignments_desc")}
            </div>
            <ul style={{ paddingLeft: "20px", margin: 0 }}>
              {forcedAssignmentWarnings.map((msg, idx) => (
                <li key={idx} style={{ marginBottom: "4px" }}>
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        ),
      });
    }

    // Show success notification independently of warnings
    if (successfullyAssignedCount > 0) {
      notification.success({
        message: t("notification_perfect_title"),
        description: t("notification_perfect_desc", {
          count: successfullyAssignedCount,
        }),
        placement: "topRight",
        duration: 4.5,
      });
    }
  };

  const reAssignOrders = () => {
    const newSelectedOrders = selectedOrders.map((order) => ({
      ...order,
      dispatcherId: undefined,
    }));
    assignOrders(newSelectedOrders);
  };

  // Memoized data grouping
  const groupedData = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    const filteredOrders = selectedId
      ? selectedOrders.filter((o) => o.dispatcherId === selectedId)
      : selectedOrders;

    filteredOrders.forEach((order) => {
      const buildingKey = order.detailedAddress || t("address_unknown");
      if (!groups[buildingKey]) groups[buildingKey] = [];
      groups[buildingKey].push(order);
    });

    return Object.entries(groups).map(([address, orders]): GroupRowData => {
      const firstDispId = orders[0].dispatcherId;
      const allSame = orders.every((o) => o.dispatcherId === firstDispId);
      const dispatcherId = allSame ? firstDispId || null : "mixed";

      let dispatcherName = "";
      if (dispatcherId === "mixed") {
        dispatcherName = t("status_mixed");
      } else if (dispatcherId) {
        const d = dispatcherMap[dispatcherId];
        dispatcherName = d ? d.name : "";
      }

      return {
        groupKey: address,
        address,
        orders,
        dispatcherId,
        dispatcherName,
      };
    });
  }, [selectedOrders, selectedId, dispatcherMap, t]);

  const sortedGroupedData = useMemo(() => {
    if (!sortOrder || !sortField) return groupedData;

    return [...groupedData].sort((a, b) => {
      let compareResult = 0;
      if (sortField === "address") {
        compareResult = a.address.localeCompare(b.address);
      } else if (sortField === "dispatcher") {
        const nameA = a.dispatcherName || "zzzz";
        const nameB = b.dispatcherName || "zzzz";
        compareResult = nameA.localeCompare(nameB);
      }
      return sortOrder === "ascend" ? compareResult : -compareResult;
    });
  }, [groupedData, sortOrder, sortField]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (groupPage - 1) * groupsPerPage;
    const endIndex = startIndex + groupsPerPage;
    return sortedGroupedData.slice(startIndex, endIndex);
  }, [groupPage, groupsPerPage, sortedGroupedData]);

  const handleTableChange = (
    _pagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    sorter: SorterResult<GroupRowData> | SorterResult<GroupRowData>[]
  ) => {
    if (!Array.isArray(sorter)) {
      setSortOrder(sorter.order as SortOrder);
      setSortField(sorter.field as string);
    }
  };

  // Memoize Main Columns
  const mainColumns = useMemo(
    () => [
      {
        title: t("table_address"),
        dataIndex: "address",
        key: "address",
        render: (text: string) => <Text strong>{text}</Text>,
        sorter: true,
        sortOrder: sortField === "address" ? sortOrder : null,
        width: "75%",
      },
      {
        title: t("table_dispatcher"),
        dataIndex: "dispatcher",
        key: "dispatcher",
        sorter: true,
        sortOrder: sortField === "dispatcher" ? sortOrder : null,
        width: "25%",
        render: (_: unknown, record: GroupRowData) => (
          <Select
            rootClassName={WIDE_DROPDOWN_CLASS}
            style={{ width: "100%", maxWidth: 250 }}
            placeholder={t("placeholder_assign_dispatcher")}
            value={record.dispatcherId === "mixed" ? null : record.dispatcherId}
            allowClear
            onChange={(value) => {
              if (value) handleGroupAssign(record.orders, value);
            }}
            options={assignmentOptions}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
    ],
    [t, sortField, sortOrder, assignmentOptions, handleGroupAssign]
  );

  return (
    <Row style={{ height: "100%" }}>
      <Col
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Space
          direction="vertical"
          size={0}
          style={{ width: "100%", flexShrink: 0 }}
        >
          <style>{customStyles}</style>
          <Space
            direction="horizontal"
            size="middle"
            style={{ marginBottom: 10 }}
          >
            <Select
              rootClassName={WIDE_DROPDOWN_CLASS}
              virtual={true}
              listHeight={300}
              defaultValue={null}
              onChange={(id: number | null) => {
                setSelectedId(id);
                const targetOrders = id
                  ? selectedOrders.filter((o) => o.dispatcherId === id)
                  : selectedOrders;
                setMarkers(getGroupedMarkers(targetOrders, dispatchers));
              }}
              options={filterOptions}
            />
            {isEveryOrderAssigned ? (
              <Popconfirm
                placement="rightBottom"
                title={t("popconfirm_title")}
                okText={t("popconfirm_ok")}
                cancelText={t("popconfirm_cancel")}
                onConfirm={reAssignOrders}
              >
                <Button
                  type="primary"
                  loading={isAssigning}
                  disabled={selectedId !== null}
                >
                  {isAssigning
                    ? t("button_assigning")
                    : t("button_auto_assign")}
                </Button>
              </Popconfirm>
            ) : (
              <Button
                type="primary"
                loading={isAssigning}
                disabled={selectedId !== null}
                onClick={() => assignOrders(selectedOrders)}
              >
                {isAssigning ? t("button_assigning") : t("button_auto_assign")}
              </Button>
            )}
          </Space>
        </Space>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <Table
            rowKey="groupKey"
            columns={mainColumns}
            dataSource={paginatedGroups}
            onChange={handleTableChange}
            expandable={{
              expandedRowRender: (record) => (
                <OrdersSubTable
                  orders={record.orders}
                  assignmentOptions={assignmentOptions}
                  onAssign={handleSingleAssign}
                  setHoveredOrderId={setHoveredOrderId}
                  t={t}
                />
              ),
              rowExpandable: (record) => record.orders.length > 0,
            }}
            pagination={{
              current: groupPage,
              pageSize: groupsPerPage,
              total: sortedGroupedData.length,
              showSizeChanger: true,
              pageSizeOptions: ["20", "50", "100"],
              showQuickJumper: true,
              onChange: (page) => setGroupPage(page),
              onShowSizeChange: (_, size) => {
                setGroupsPerPage(size);
                setGroupPage(1);
              },
              showTotal: (total, range) =>
                t("pagination_total", {
                  start: range[0],
                  end: range[1],
                  total,
                }),
              position: ["bottomCenter"],
              size: "small",
            }}
            scroll={{ y: "calc(100vh - 200px)" }}
            size="middle"
            bordered
          />
        </div>
      </Col>
    </Row>
  );
}

AssignDispatchers.needMap = true;
