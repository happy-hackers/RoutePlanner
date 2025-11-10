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
  Collapse,
  Pagination,
} from "antd";
import dayjs from "dayjs";
import { useState, useEffect, useMemo } from "react";
import {
  getAllCustomers,
  getAllDispatchers,
  getAllOrders,
} from "../utils/dbUtils";
import type { Order } from "../types/order.ts";
import type { MarkerData } from "../types/markers";
import { setMarkersList } from "../utils/markersUtils.ts";
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
const { Panel } = Collapse;

export default function ViewOrders({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const { t } = useTranslation("ViewOrdersPage");
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
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState("");
  const [groupView, setGroupView] = useState(true);
  const [groupPage, setGroupPage] = useState(1);
  const groupsPerPage = 20;

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
        const timeDisplay = time.charAt(0).toUpperCase() + time.slice(1);
        return `${date} ${timeDisplay}`;
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
      setSelectedRowIds((prev) => [...prev, record.id]);
      const sortedOrders = sortOrders([...selectedOrders, record]);
      dispatch(setSelectedOrders(sortedOrders));
    } else {
      setSelectedRowIds(selectedRowIds.filter((id) => id !== record.id));
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
      /*changeRows.forEach((record) => {
            setSelectedRowIds((prev) => [...prev, record.id]);
          });*/
      setSelectedRowIds((prev) => [...prev, ...changedId]);
      const sortedOrders = sortOrders([...selectedOrders, ...changeRows]);
      dispatch(setSelectedOrders(sortedOrders));
    } else {
      setSelectedRowIds((prev) => prev.filter((id) => !changedId.includes(id)));
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

  const translatedTimeOptions = timeOptions.map(time => ({
    label: t(`time_period_${time.toLowerCase()}`),
    value: time,
  }));

  //need check
  // const translatedStateOptions = stateOptions.map(status => ({
  //   label: t(`status_${status.toLowerCase().replace(' ', '_')}`),
  //   value: status,
  // }));

  // Fetch orders and customers from Supabase
  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, [isUploadModalOpen]);

  useEffect(() => {
    setSelectedRowIds(selectedOrders.map((order) => order.id));
  }, [selectedOrders]);

  useEffect(() => {
    setGroupPage(1);
  }, [status, searchText, date, timePeriod]);

  // Use useMemo to cache filtered orders and prevent infinite re-renders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = dayjs(order.date);

      const matchesDate = date ? orderDate.isSame(date, "day") : true; // If there is a date selected, filter by the selected date. OtherWise, show the orders in all date
      const matchesTimePeriod =
        timePeriod && timePeriod.length > 0
          ? timePeriod.includes(order.time)
          : true; // If there is/are time period ticked, filter by the ticked one. OtherWise, show the orders in all time period

      // Regard "Delivered" orders as completed orders and others as incompleted orders
      const isComplete = order.status === "Delivered";
      const isIncomplete = order.status !== "Delivered";

      let matchesStatus = true;
      if (status === "Complete") {
        matchesStatus = isComplete;
      } else if (status === "Incomplete") {
        matchesStatus = isIncomplete;
      } else {
        // If selected "All"
        matchesStatus = true;
      }

      // Search filtering
      const normalizedSearch = searchText.toLowerCase();
      const matchesSearch =
        !searchText ||
        String(order.id).toLowerCase().includes(normalizedSearch) || // Meter ID
        (order.detailedAddress || "").toLowerCase().includes(normalizedSearch); // Address

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

  const sortedOrders = sortOrders(filteredOrders);

  useEffect(() => {
    const fetchAndSetMarkers = async () => {
      const dispatchersData = await getAllDispatchers();
      if (dispatchersData)
        setMarkers(setMarkersList(selectedOrders, dispatchersData));
    };

    fetchAndSetMarkers();
  }, [selectedOrders, setMarkers]);

  return (
    <Row style={{ height: "100vh" }}>
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
            />
          </Space>
          <DatePicker
            defaultValue={date}
            onChange={(value) => dispatch(setDate(value))}
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
              options={statusOptions}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </Row>
          <Row>
            <Text strong style={{ marginRight: 20 }}>
              Search:
            </Text>
            <Input.Search
              placeholder="Search by Address or Meter ID"
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
              <span>View Mode:</span>
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
            setSelectedRowIds={setSelectedRowIds}
          />
          {groupView ? (
            <>
              <div
                style={{
                  flex: 1,
                  maxHeight: "calc(100vh - 320px)",
                  minHeight: 0,
                  overflowY: "auto",
                  paddingTop: 8,
                }}
              >
                <Collapse accordion>
                  {paginatedGroups.map(([address, ordersInGroup]) => {
                    const completedCount = ordersInGroup.filter(
                      (o) => o.status === "Delivered"
                    ).length;
                    const incompleteCount =
                      ordersInGroup.length - completedCount;

                    return (
                      <Panel
                        key={address}
                        header={
                          <Row
                            justify="space-between"
                            style={{ width: "100%" }}
                          >
                            <Text strong>{address}</Text>
                            <Text>
                              ✔️ {completedCount} | ❌ {incompleteCount}
                            </Text>
                          </Row>
                        }
                        style={{
                          background:
                            incompleteCount > 0 ? "#fff2f0" : "#f6ffed",
                          borderRadius: 6,
                          marginBottom: 8,
                        }}
                      >
                        <Table
                          rowKey="id"
                          dataSource={ordersInGroup}
                          size="small"
                          pagination={false}
                          columns={[
                            { title: "ID", dataIndex: "id" },
                            {
                              title: "Address",
                              dataIndex: "detailedAddress",
                            },
                            {
                              title: "Status",
                              dataIndex: "status",
                              render: (s: string) =>
                                s === "Delivered"
                                  ? "✔️ Complete"
                                  : "❌ Incomplete",
                            },
                          ]}
                        />
                      </Panel>
                    );
                  })}
                </Collapse>
              </div>
              <Pagination
                current={groupPage}
                pageSize={groupsPerPage}
                total={groupedEntries.length}
                onChange={(page) => setGroupPage(page)}
                showSizeChanger={false}
                style={{ marginTop: 16, textAlign: "center" }}
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
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} orders`,
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
