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
import { useState, useEffect, useMemo } from "react";
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

export default function AssignDispatchers({
  setMarkers,
  setHoveredOrderId,
}: {
  setMarkers: (markers: MarkerData[]) => void;
  hoveredOrderId: number | null;
  setHoveredOrderId: (id: number | null) => void;
}) {
  const { t } = useTranslation("assignDispatcher");
  const { message } = App.useApp();
  const dispatch = useDispatch();
  const selectedOrders = useSelector(
    (state: RootState) => state.order.selectedOrders
  );
  const isEveryOrderAssigned = selectedOrders.every(
    (order) => order.dispatcherId !== null && order.dispatcherId !== undefined
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

  const sortedDispatchers = [...dispatchers].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const filterOptions = [
    { value: null, label: t("select_all_dispatchers") },
    ...sortedDispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  const assignmentOptions = sortedDispatchers.map((dispatcher) => ({
    value: dispatcher.id,
    label: dispatcher.name,
  }));

  type OrderPayload = Omit<Order, "customer" | "matchedDispatchers">;

  const updateOrderInDb = async (order: Order, dispatcherId: number) => {
    const { customer, ...restProps } = order;
    const propsWithPossibleMatch = restProps as typeof restProps & {
      matchedDispatchers?: unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { matchedDispatchers, ...cleanRest } = propsWithPossibleMatch;
    const payload: OrderPayload = {
      ...(cleanRest as OrderPayload),
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

  const handleSingleAssign = async (order: Order, dispatcherId: number) => {
    const dispatcher = dispatchers.find((d) => d.id === dispatcherId);
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
    const dispatcher = dispatchers.find((d) => d.id === dispatcherId);
    if (!dispatcher) return;

    const newOrders = [...selectedOrders];
    let successCount = 0;
    let hasUpdate = false;

    for (const order of ordersToAssign) {
      if (order.dispatcherId === dispatcherId) continue;

      const { result, updatedOrder, originalCustomer } = await updateOrderInDb(
        order,
        dispatcherId
      );

      if (result.success) {
        const index = newOrders.findIndex((o) => o.id === order.id);
        if (index > -1) {
          newOrders[index] = { ...updatedOrder, customer: originalCustomer };
          successCount++;
          hasUpdate = true;
        }
      }
    }

    if (hasUpdate) {
      dispatch(setSelectedOrders(newOrders));
      const markers = getGroupedMarkers(newOrders, dispatchers);
      setMarkers(markers);

      if (successCount > 0) {
        message.success(
          t("message_success_bulk", {
            count: successCount,
            name: dispatcher.name,
          })
        );
      }
    } else {
      message.info(
        t("message_warning_no_change", {
          defaultValue:
            "All orders in this group are already assigned to this dispatcher.",
        })
      );
    }
  };

  const assignOrders = async (selectedOrders: Order[]) => {
    setIsAssigning(true);
    if (dispatchers.length === 0) return;
    let updatedOrders = [...selectedOrders];

    const handleAutoUpdate = async (order: Order, dispatcher: Dispatcher) => {
      const { result, updatedOrder, originalCustomer } = await updateOrderInDb(
        order,
        dispatcher.id
      );
      if (result.success) {
        updatedOrders = updatedOrders.map((o) =>
          o.id === order.id
            ? { ...updatedOrder, customer: originalCustomer }
            : o
        );
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
    };

    const getLeastAssigned = (ds: Dispatcher[], currentOrders: Order[]) => {
      let minD: Dispatcher | null = null;
      let minC = Infinity;
      for (const d of ds) {
        const count = currentOrders.filter(
          (o) => o.dispatcherId === d.id
        ).length;
        if (count < minC) {
          minC = count;
          minD = d;
        }
      }
      return minD;
    };

    const unassignedWithMatches: { order: Order; matches: Dispatcher[] }[] = [];
    const unassignedNoMatches: Order[] = [];

    for (const order of selectedOrders) {
      if (order.dispatcherId) continue;
      if (!order.customer) continue;
      //get order time
      const orderDayKey = dayjs(order.date).format("ddd").toLowerCase();
      const orderPeriod = order.time;
      const matches = dispatchers.filter((d) => {
        //check if district and area are matched
        const isDistrictMatch = d.responsibleArea.some(
          ([, dist]) =>
            dist?.toLowerCase() === order.customer?.district.toLowerCase()
        );
        const isAreaMatch = d.responsibleArea.some(
          ([area]) => area?.toLowerCase() === order.customer?.area.toLowerCase()
        );
        const isLocationMatch = isDistrictMatch || isAreaMatch;
        if (!isLocationMatch) return false;
        //check if time is matched
        const activeDays = d.activeDay || {};
        const activePeriods = activeDays[orderDayKey] || [];
        //validate
        const isTimeMatch = activePeriods.some(
          (p) => p.toLowerCase() === orderPeriod.toLowerCase()
        );
        return isTimeMatch;
      });

      if (matches.length === 1) {
        //only one match, auto assign
        await handleAutoUpdate(order, matches[0]);
      } else if (matches.length > 1) {
        //more than one match, add to list for later
        unassignedWithMatches.push({ order, matches });
      } else {
        //No match
        unassignedNoMatches.push(order);
      }
    }

    for (const item of unassignedWithMatches) {
      const currentAddress = item.order.detailedAddress;
      //find dispatchers with same location
      const dispatchersWithSameLocation = item.matches.filter((d) =>
        updatedOrders.some(
          (o) => o.dispatcherId === d.id && o.detailedAddress === currentAddress
        )
      );
      //if there are dispatchers with same location, use them
      const candidatePool =
        dispatchersWithSameLocation.length > 0
          ? dispatchersWithSameLocation
          : item.matches;

      const bestD = getLeastAssigned(candidatePool, updatedOrders);
      if (bestD) await handleAutoUpdate(item.order, bestD);
    }

    for (const order of unassignedNoMatches) {
      const bestD = getLeastAssigned(dispatchers, updatedOrders);
      if (bestD) await handleAutoUpdate(order, bestD);
    }

    dispatch(setSelectedOrders(updatedOrders));
    const markers = getGroupedMarkers(updatedOrders, dispatchers);
    setMarkers(markers);
    setIsAssigning(false);
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
      const buildingKey = order.detailedAddress || "Unknown Address";
      if (!groups[buildingKey]) groups[buildingKey] = [];
      groups[buildingKey].push(order);
    });

    return Object.entries(groups).map(([address, orders]): GroupRowData => {
      const firstDispId = orders[0].dispatcherId;
      const allSame = orders.every((o) => o.dispatcherId === firstDispId);
      const dispatcherId = allSame ? firstDispId || null : "mixed";

      let dispatcherName = "";
      if (dispatcherId === "mixed") {
        dispatcherName = "Mixed";
      } else if (dispatcherId) {
        const d = dispatchers.find((disp) => disp.id === dispatcherId);
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
  }, [selectedOrders, selectedId, dispatchers]);

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

  const columns = [
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
                if (id) {
                  const selectedDispatcher = dispatchers.find(
                    (d) => d.id === id
                  );
                  if (selectedDispatcher) {
                    const filteredOrders = selectedOrders.filter(
                      (order) => order.dispatcherId === id
                    );
                    const filteredMarkers = getGroupedMarkers(
                      filteredOrders,
                      dispatchers
                    );
                    setMarkers(filteredMarkers);
                  }
                } else {
                  const allMarkers = getGroupedMarkers(
                    selectedOrders,
                    dispatchers
                  );
                  setMarkers(allMarkers);
                }
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
            columns={columns}
            dataSource={paginatedGroups}
            onChange={handleTableChange}
            expandable={{
              expandedRowRender: (record) => (
                <Table
                  rowKey="id"
                  dataSource={record.orders}
                  pagination={false}
                  size="small"
                  showHeader={true}
                  columns={[
                    {
                      title: t("table_id"),
                      dataIndex: "id",
                      width: "35%",
                    },
                    {
                      title: t("table_time"),
                      dataIndex: "time",
                      width: "40%",
                      render: (time, order) =>
                        `${dayjs(order.date).format("MM-DD")} ${time}`,
                    },
                    {
                      title: t("table_dispatcher"),
                      width: "25%",
                      render: (_, order) => (
                        <Select
                          rootClassName={WIDE_DROPDOWN_CLASS}
                          style={{ width: "100%", minWidth: 120 }}
                          placeholder={t("status_unassigned")}
                          value={order.dispatcherId || null}
                          allowClear={false}
                          onChange={(value) => handleSingleAssign(order, value)}
                          options={assignmentOptions}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ),
                    },
                  ]}
                  onRow={(record) => ({
                    onMouseEnter: () => setHoveredOrderId(record.id),
                    onMouseLeave: () => setHoveredOrderId(null),
                  })}
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
