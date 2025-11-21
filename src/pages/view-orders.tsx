import NewOrderModal from "../components/NewOrderModal";
import {
  DatePicker,
  Row,
  Col,
  Space,
  Checkbox,
  Typography,
  Button,
  Badge,
  Table,
  Radio,
  Input,
  Switch,
} from "antd";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getAllCustomers,
  getAllDispatchers,
  getAllOrders,
} from "../utils/dbUtils";
import type { Order } from "../types/order.ts";
import type { MarkerData } from "../types/markers";
import { getGroupedMarkers } from "../utils/markersUtils.ts";
import type { Customer } from "../types/customer.ts";

import { BatchUploadModal } from "../components/batch-upload";
import { useSelector, useDispatch } from "react-redux";
import {
  setDate,
  setTimePeriod,
  setSelectedOrders,
} from "../store/orderSlice.ts";
import type { RootState } from "../store";
import SelectedOrderModal from "../components/SelectedOrderModal.tsx";
import { sortOrders } from "../utils/sortingUtils.ts";
import { useTranslation } from "react-i18next";

type TimePeriod = "Morning" | "Afternoon" | "Evening";

const { Text } = Typography;

interface GroupRowData {
  groupKey: string;
  address: string;
  completeCount: number;
  incompleteCount: number;
  orders: Order[];
  rowType: "green" | "red" | "yellow";
  allSelected: boolean;
  anySelected: boolean;
}

export default function ViewOrders({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const { t } = useTranslation("viewOrder");
  const dispatch = useDispatch();
  const selectedOrders = useSelector(
    (state: RootState) => state.order.selectedOrders
  );
  const date = useSelector((state: RootState) => state.order.date);
  const timePeriod = useSelector((state: RootState) => state.order.timePeriod);
  const [status, setStatus] = useState("All");
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSelectedOrderModal, setIsSelectedOrderModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [groupView, setGroupView] = useState(false);
  const [groupPage, setGroupPage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(20);
  const [groupsPerPage, setGroupsPerPage] = useState(20);

  const selectedRowIds = useMemo(
    () => selectedOrders.map((o) => o.id),
    [selectedOrders]
  );

  const customStyles = `
    .ant-table-tbody > tr.grouped-order-row > td.ant-table-cell {
      background-color: transparent !important;
    }
    .ant-table-tbody > tr.grouped-order-row.row-status-green {
      background-color: #d9f7be !important;
    }
    .ant-table-tbody > tr.grouped-order-row.row-status-green:hover > td {
      background-color: #c7e8aa !important;
    }
    .ant-table-tbody > tr.grouped-order-row.row-status-red {
      background-color: #ffccc7 !important;
    }
    .ant-table-tbody > tr.grouped-order-row.row-status-red:hover > td {
      background-color: #e8baba !important;
    }
    .ant-table-tbody > tr.grouped-order-row.row-status-yellow {
      background-color: #fffbe6 !important;
    }
    .ant-table-tbody > tr.grouped-order-row.row-status-yellow:hover > td {
      background-color: #e8e5d3 !important;
    }
    .ant-table-tbody > tr.grouped-order-row.ant-table-row-selected > td {
      background-color: transparent !important;
    }
    .ant-table-tbody > tr.grouped-order-row:hover > td {
       background-color: transparent !important; 
    }
  `;

  const getGroupRowData = useCallback(
    (address: string, ordersInGroup: Order[]): GroupRowData => {
      const completeCount = ordersInGroup.filter(
        (o) => o.status === "Delivered"
      ).length;
      const incompleteCount = ordersInGroup.length - completeCount;
      const totalCount = ordersInGroup.length;

      let rowType: "green" | "red" | "yellow";
      if (completeCount === totalCount) {
        rowType = "green";
      } else if (incompleteCount === totalCount) {
        rowType = "red";
      } else {
        rowType = "yellow";
      }

      const allSelected = ordersInGroup.every((order) =>
        selectedRowIds.includes(order.id)
      );

      const anySelected = ordersInGroup.some((order) =>
        selectedRowIds.includes(order.id)
      );

      return {
        groupKey: address,
        address,
        completeCount,
        incompleteCount,
        orders: ordersInGroup,
        rowType,
        allSelected,
        anySelected,
      };
    },
    [selectedRowIds]
  );

  const columns = [
    {
      title: t("table_id"),
      dataIndex: "id",
      key: "id",
      width: "10%",
    },
    {
      title: t("table_delivery_time"),
      dataIndex: "time",
      key: "deliveryTime",
      width: "20%",
      render: (time: string, record: Order) => {
        const date = dayjs(record.date).format("YYYY-MM-DD");
        const translatedTime = t(`time_period_${time.toLowerCase()}`);
        return `${date} ${translatedTime}`;
      },
    },
    {
      title: t("table_address"),
      dataIndex: "detailedAddress",
      key: "detailedAddress",
      width: "50%",
      render: (detailedAddress: string, record: Order) => {
        return `${detailedAddress}, ${record.area}`;
      },
    },
    {
      title: t("table_status"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        if (status === "Delivered") return <span>✔️</span>;
        else return <span>❌</span>;
      },
      width: "15%",
    },
  ];

  const handleRowSelect = (record: Order, selected: boolean) => {
    if (selected) {
      const sortedOrders = sortOrders([...selectedOrders, record]);
      dispatch(setSelectedOrders(sortedOrders));
    } else {
      dispatch(
        setSelectedOrders(
          selectedOrders.filter((order) => order.id !== record.id)
        )
      );
    }
  };

  const handleAllRowSelect = (
    selected: boolean,
    _selectedRows: Order[],
    changeRows: Order[]
  ) => {
    const changedId = changeRows.map((row) => row.id);
    if (selected) {
      const sortedOrders = sortOrders([...selectedOrders, ...changeRows]);
      dispatch(setSelectedOrders(sortedOrders));
    } else {
      dispatch(
        setSelectedOrders(
          selectedOrders.filter((order) => !changedId.includes(order.id))
        )
      );
    }
  };

  const rowSelection = {
    selectedRowKeys: selectedRowIds,
    onSelect: handleRowSelect,
    onSelectAll: handleAllRowSelect,
  };

  const fetchOrders = async () => {
    const ordersData = await getAllOrders();
    if (ordersData) {
      setOrders(ordersData);
    }
  };

  const fetchCustomers = async () => {
    const customersData = await getAllCustomers();
    if (customersData) {
      setCustomers(customersData);
    }
  };
  const timeOptions: TimePeriod[] = ["Morning", "Afternoon", "Evening"];
  const statusOptions = ["All", "Complete", "Incomplete"];

  const translatedTimeOptions = timeOptions.map((time) => ({
    label: t(`time_period_${time.toLowerCase()}`),
    value: time,
  }));

  const translatedStatusOptions = statusOptions.map((status) => ({
    label: t(`status_${status.toLowerCase()}`),
    value: status,
  }));

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, [isUploadModalOpen]);

  useEffect(() => {
    setGroupPage(1);
  }, [status, searchText, date, timePeriod]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesDate = date
        ? order.date === date.format("YYYY-MM-DD")
        : true;
      const matchesTimePeriod =
        timePeriod && timePeriod.length > 0
          ? timePeriod.includes(order.time)
          : true;

      const isComplete = order.status === "Delivered";
      const isIncomplete = order.status !== "Delivered";

      let matchesStatus = true;
      if (status === "Complete") {
        matchesStatus = isComplete;
      } else if (status === "Incomplete") {
        matchesStatus = isIncomplete;
      } else {
        matchesStatus = true;
      }

      const normalizedSearch = searchText.toLowerCase();
      const matchesSearch =
        !searchText ||
        String(order.id).toLowerCase().includes(normalizedSearch) ||
        (order.detailedAddress || "").toLowerCase().includes(normalizedSearch);

      return matchesDate && matchesTimePeriod && matchesStatus && matchesSearch;
    });
  }, [orders, date, timePeriod, status, searchText]);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};

    filteredOrders.forEach((order) => {
      const buildingKey = order.detailedAddress || "Unknown Address";
      if (!groups[buildingKey]) groups[buildingKey] = [];
      groups[buildingKey].push(order);
    });

    return groups;
  }, [filteredOrders]);

  const groupedEntries = useMemo(() => {
    const entries = Object.entries(groupedOrders);
    return entries;
  }, [groupedOrders]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (groupPage - 1) * groupsPerPage;
    const endIndex = startIndex + groupsPerPage;
    return groupedEntries.slice(startIndex, endIndex);
  }, [groupPage, groupsPerPage, groupedEntries]);

  const handleGroupSelect = (record: GroupRowData, checked: boolean) => {
    const orderIdsInGroup = record.orders.map((order) => order.id);

    if (checked) {
      const newSelectedOrders = [...selectedOrders];
      record.orders.forEach((order) => {
        if (!selectedOrders.some((so) => so.id === order.id)) {
          newSelectedOrders.push(order);
        }
      });
      dispatch(setSelectedOrders(sortOrders(newSelectedOrders)));
    } else {
      dispatch(
        setSelectedOrders(
          selectedOrders.filter((order) => !orderIdsInGroup.includes(order.id))
        )
      );
    }
  };

  const groupedDataSource = useMemo(() => {
    return paginatedGroups.map(([address, ordersInGroup]) =>
      getGroupRowData(address, ordersInGroup)
    );
  }, [paginatedGroups, getGroupRowData]);

  const handleGroupSelectAll = (checked: boolean) => {
    const currentPageOrders = groupedDataSource.flatMap(
      (group) => group.orders
    );
    const currentPageOrderIds = currentPageOrders.map((order) => order.id);

    if (checked) {
      const ordersToAdd = currentPageOrders.filter(
        (order) => !selectedOrders.some((so) => so.id === order.id)
      );
      dispatch(
        setSelectedOrders(sortOrders([...selectedOrders, ...ordersToAdd]))
      );
    } else {
      dispatch(
        setSelectedOrders(
          selectedOrders.filter(
            (order) => !currentPageOrderIds.includes(order.id)
          )
        )
      );
    }
  };

  const isPageAllSelected =
    groupedDataSource.length > 0 &&
    groupedDataSource.every((r) => r.allSelected);
  const isPageAnySelected = groupedDataSource.some((r) => r.anySelected);
  const isPageIndeterminate = isPageAnySelected && !isPageAllSelected;

  const totalOrders = filteredOrders.length;
  const totalGroups = groupedEntries.length;

  const tablePageSizeOptions = ["20", "50", "100", String(totalOrders)];
  const groupPageSizeOptions = ["20", "50", "100", String(totalGroups)];

  const sortedOrders = sortOrders(filteredOrders);

  useEffect(() => {
    const fetchAndSetMarkers = async () => {
      const dispatchersData = await getAllDispatchers();
      if (!dispatchersData) return;

      const markers = getGroupedMarkers(selectedOrders, dispatchersData);
      setMarkers(markers);
    };

    fetchAndSetMarkers();
  }, [selectedOrders, setMarkers]);

  const groupColumns = [
    {
      title: (
        <Checkbox
          indeterminate={isPageIndeterminate}
          checked={isPageAllSelected}
          onChange={(e) => handleGroupSelectAll(e.target.checked)}
        />
      ),
      dataIndex: "groupSelector",
      key: "groupSelector",
      width: "5%",
      align: "center" as const,
      render: (_: unknown, record: GroupRowData) => (
        <Checkbox
          indeterminate={record.anySelected && !record.allSelected}
          checked={record.allSelected}
          onChange={(e) => handleGroupSelect(record, e.target.checked)}
        />
      ),
    },
    {
      title: t("table_address"),
      dataIndex: "address",
      key: "address",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: t("status_complete"),
      dataIndex: "completeCount",
      align: "center" as const,
      width: "10%",
      render: (count: number) => <span>✔️ {count}</span>,
    },
    {
      title: t("status_incomplete"),
      dataIndex: "incompleteCount",
      align: "center" as const,
      width: "10%",
      render: (count: number) => <span>❌ {count}</span>,
    },
  ];

  return (
    <Row style={{ height: "100vh" }}>
      <style>{customStyles}</style>

      <Col
        style={{
          height: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Space
          direction="vertical"
          size="middle"
          style={{
            width: "100%",
            flexShrink: 0,
          }}
        >
          <Space direction="horizontal" size="middle">
            <NewOrderModal
              date={date}
              customers={customers}
              fetchOrders={fetchOrders}
            />
            <Button type="primary" onClick={() => setIsUploadModalOpen(true)}>
              {t("button_bulk_import")}
            </Button>
            <BatchUploadModal
              isOpen={isUploadModalOpen}
              setOpen={setIsUploadModalOpen}
              onUploadComplete={fetchOrders}
              isMapReady={false}
              isGoogleMapSelected={false}
            />
          </Space>
          <DatePicker
            value={date}
            onChange={(value) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dispatch(setDate((value ? value.startOf("day") : null) as any))
            }
            style={{ width: "300px" }}
            format="YYYY-MM-DD"
          />
          <Row>
            <Text strong style={{ marginRight: 20 }}>
              {t("label_time")}:
            </Text>
            <Checkbox.Group
              options={translatedTimeOptions}
              defaultValue={timePeriod}
              onChange={(values: TimePeriod[]) =>
                dispatch(setTimePeriod(values))
              }
            />
          </Row>

          <Row>
            <Text strong style={{ marginRight: 20 }}>
              {t("label_status")}:
            </Text>
            <Radio.Group
              options={translatedStatusOptions}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </Row>
          <Row>
            <Text strong style={{ marginRight: 20 }}>
              {t("label_search")}:
            </Text>
            <Input.Search
              placeholder={t("placeholder_search")}
              allowClear
              style={{ width: 350 }}
              onSearch={(value) => setSearchText(value.trim())}
              onChange={(e) => setSearchText(e.target.value.trim())}
            />
          </Row>
        </Space>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Row
            justify="space-between"
            style={{ marginBottom: 8, marginTop: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{t("label_view_mode")}:</span>
              <Switch
                checked={groupView}
                onChange={() => setGroupView(!groupView)}
                checkedChildren="Grouped View"
                unCheckedChildren="Table View"
                style={{
                  backgroundColor: groupView ? "#31694E" : "#B87C4C",
                }}
              />
            </div>
            <Badge
              count={selectedOrders.length}
              offset={[-2, 2]}
              style={{
                fontSize: "10px",
                height: "16px",
                width: "18px",
                minWidth: "10px",
                lineHeight: "16px",
              }}
            >
              <Button
                type="primary"
                onClick={() => setIsSelectedOrderModal(true)}
              >
                {t("button_selected_orders")}
              </Button>
            </Badge>
          </Row>

          <SelectedOrderModal
            orders={selectedOrders}
            isVisible={isSelectedOrderModal}
            setVisibility={setIsSelectedOrderModal}
            setSelectedRowIds={() => { }}
          />
          {groupView ? (
            <>
              <Table
                rowKey="groupKey"
                rowClassName={(record) =>
                  `grouped-order-row row-status-${record.rowType}`
                }
                columns={groupColumns}
                dataSource={groupedDataSource}
                expandable={{
                  expandedRowRender: (record) => (
                    <Table
                      rowKey="id"
                      dataSource={record.orders}
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: t("table_id"),
                          dataIndex: "id",
                          key: "id",
                          width: 100,
                        },
                        {
                          title: t("table_delivery_time"),
                          dataIndex: "time",
                          key: "time",
                          render: (time: string, order: Order) => {
                            const date = dayjs(order.date).format("YYYY-MM-DD");
                            const translatedTime = t(
                              `time_period_${time.toLowerCase()}`
                            );
                            return `${date} ${translatedTime}`;
                          },
                        },
                        {
                          title: t("table_status"),
                          dataIndex: "status",
                          key: "status",
                          render: (s: string) =>
                            s === "Delivered"
                              ? `✔️ ${t("status_complete")}`
                              : `❌ ${t("status_incomplete")}`,
                        },
                      ]}
                    />
                  ),
                  rowExpandable: (record) =>
                    Array.isArray(record.orders) && record.orders.length > 0,
                }}
                pagination={{
                  current: groupPage,
                  pageSize: groupsPerPage,
                  total: groupedEntries.length,
                  showSizeChanger: true,
                  pageSizeOptions: groupPageSizeOptions,
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
                      total: total,
                    }),
                  position: ["bottomCenter"],
                  showLessItems: true,
                  size: "small",
                  style: { marginTop: 16, textAlign: "center" },
                }}
                scroll={{ y: "calc(100vh - 390px)" }}
                size="middle"
                bordered
                style={{ maxWidth: 650, height: "100%" }}
              />
            </>
          ) : (
            <div style={{ flex: 1, overflow: "auto" }}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={sortedOrders}
                rowSelection={rowSelection}
                scroll={{ y: "calc(100vh - 390px)" }}
                pagination={{
                  pageSize: tablePageSize,
                  onShowSizeChange: (_, size) => setTablePageSize(size),
                  showSizeChanger: true,
                  pageSizeOptions: tablePageSizeOptions,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    t("pagination_total", {
                      start: range[0],
                      end: range[1],
                      total: total,
                    }),
                  position: ["bottomCenter"],
                  showLessItems: true,
                  size: "small",
                }}
                style={{ maxWidth: 650, height: "100%" }}
              />
            </div>
          )}
        </div>
      </Col>
    </Row>
  );
}

ViewOrders.needMap = true;