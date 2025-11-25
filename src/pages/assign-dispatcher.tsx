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
import { useState, useEffect, useMemo, memo } from "react";
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

const { Text } = Typography;

const WIDE_DROPDOWN_CLASS = "local-wide-select-dropdown";

const customStyles = `
  .ant-select-dropdown.${WIDE_DROPDOWN_CLASS} {
    width: 250px !important; 
    min-width: 250px !important;
  }
`;

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

  // check location
  const isDistrictMatch = d.responsibleArea.some(
    ([, dist]) => dist?.toLowerCase() === order.customer?.district.toLowerCase()
  );
  const isAreaMatch = d.responsibleArea.some(
    ([area]) => area?.toLowerCase() === order.customer?.area.toLowerCase()
  );
  const isLocationMatch = isDistrictMatch || isAreaMatch;

  // check time
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

  const handleSingleAssign = async (order: Order, dispatcherId: number) => {
    const dispatcher = dispatcherMap[dispatcherId];
    if (!dispatcher) return;

    const { result, updatedOrder, originalCustomer } = await updateOrderInDb(
      order,
      dispatcherId
    );

    if (result.success) {
      const newOrders = selectedOrders.map((o) =>
        o.id === order.id ? { ...updatedOrder, customer: originalCustomer } : o
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
        t("message_error_update", { orderId: order.id, error: result.error })
      );
    }
  };

  const handleGroupAssign = async (
    ordersToAssign: Order[],
    dispatcherId: number
  ) => {
    const dispatcher = dispatcherMap[dispatcherId];
    if (!dispatcher) return;

    const ordersNeedingUpdate = ordersToAssign.filter(
      (o) => o.dispatcherId !== dispatcherId
    );

    if (ordersNeedingUpdate.length === 0) {
      message.info(
        t("message_warning_no_change", {
          defaultValue:
            "All orders in this group are already assigned to this dispatcher.",
        })
      );
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
    const newOrders = [...selectedOrders];
    let hasUpdate = false;

    results.forEach(({ result, updatedOrder, originalCustomer, orderId }) => {
      if (result.success) {
        const index = newOrders.findIndex((o) => o.id === orderId);
        if (index > -1) {
          newOrders[index] = { ...updatedOrder, customer: originalCustomer };
          successCount++;
          hasUpdate = true;
        }
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
  };

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
      message.info(
        t("message_all_assigned_before_click", {
          defaultValue: "All selected orders were already assigned.",
        })
      );
      setIsAssigning(false);
      return;
    }

    const dispatcherLoadMap = new Map<number, Set<string>>();

    ordersToProcess.forEach((o) => {
      if (o.dispatcherId) {
        const set = dispatcherLoadMap.get(o.dispatcherId) || new Set();
        set.add(o.detailedAddress || String(o.id));
        dispatcherLoadMap.set(o.dispatcherId, set);
      }
    });

    const getLoadCount = (dId: number) => dispatcherLoadMap.get(dId)?.size || 0;

    const incrementLoad = (dId: number, address: string) => {
      const set = dispatcherLoadMap.get(dId) || new Set();
      set.add(address);
      dispatcherLoadMap.set(dId, set);
    };

    const getLeastAssignedFromCandidates = (candidates: Dispatcher[]) => {
      if (candidates.length === 0) return null;
      return candidates.reduce((prev, curr) =>
        getLoadCount(curr.id) < getLoadCount(prev.id) ? curr : prev
      );
    };

    const assignmentsQueue: {
      order: Order;
      dispatcher: Dispatcher;
      warningReason?: string;
    }[] = [];

    const forcedAssignmentWarnings: string[] = [];

    for (const order of unassignedOrders) {
      const addressKey = order.detailedAddress || String(order.id);

      const matches = dispatchers.filter((d) => {
        const { isLocationMatch, isTimeMatch } = checkMatch(d, order);
        return isLocationMatch && isTimeMatch;
      });

      let selectedDispatcher: Dispatcher | null = null;
      let warningReason = "";

      if (matches.length === 1) {
        selectedDispatcher = matches[0];
      } else if (matches.length > 1) {
        const dispatchersAtLocation = matches.filter((d) =>
          dispatcherLoadMap.get(d.id)?.has(addressKey)
        );

        const candidatePool =
          dispatchersAtLocation.length > 0 ? dispatchersAtLocation : matches;

        selectedDispatcher = getLeastAssignedFromCandidates(candidatePool);
      } else {
        // No perfect match
        let candidates: Dispatcher[] = [];

        // Try Area match only
        candidates = dispatchers.filter(
          (d) => checkMatch(d, order).isLocationMatch
        );
        if (candidates.length > 0) {
          warningReason = t("warning_time_mismatch", {
            defaultValue: "Area match only (Time ignored)",
          });
        } else {
          // Try Time match only
          candidates = dispatchers.filter(
            (d) => checkMatch(d, order).isTimeMatch
          );
          if (candidates.length > 0) {
            warningReason = t("warning_area_mismatch", {
              defaultValue: "Time match only (Area ignored)",
            });
          } else {
            // Force assign
            candidates = dispatchers;
            warningReason = t("warning_all_mismatch", {
              defaultValue: "No match (Forced assignment)",
            });
          }
        }
        selectedDispatcher = getLeastAssignedFromCandidates(candidates);
      }

      if (selectedDispatcher) {
        incrementLoad(selectedDispatcher.id, addressKey);
        assignmentsQueue.push({
          order,
          dispatcher: selectedDispatcher,
          warningReason,
        });
      }
    }

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
    const updatedOrders = [...ordersToProcess];

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
          const index = updatedOrders.findIndex((o) => o.id === orderId);
          if (index > -1) {
            updatedOrders[index] = {
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

    // Update State
    dispatch(setSelectedOrders(updatedOrders));
    const markers = getGroupedMarkers(updatedOrders, dispatchers);
    setMarkers(markers);
    setIsAssigning(false);

    // Notifications
    if (forcedAssignmentWarnings.length > 0) {
      modal.warning({
        title: t("warning_forced_assignments_title", {
          defaultValue: "Assignments with Constraints Ignored",
        }),
        width: 500,
        content: (
          <div
            style={{ maxHeight: "300px", overflowY: "auto", marginTop: "10px" }}
          >
            <div style={{ marginBottom: "10px" }}>
              {t("warning_forced_assignments_desc", {
                defaultValue:
                  "The following orders were assigned despite mismatching constraints:",
              })}
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
    } else if (successfullyAssignedCount > 0) {
      notification.success({
        message: t("notification_perfect_title", {
          defaultValue: "Automatic Assignment Complete",
        }),
        description: t("notification_perfect_desc", {
          count: successfullyAssignedCount,
          defaultValue: `Successfully assigned ${successfullyAssignedCount} order(s) without violating any area or time constraints.`,
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

  const mainColumns = [
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
  ];

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
