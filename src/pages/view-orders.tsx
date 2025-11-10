import NewOrderModal from "../components/NewOrderModal";
import { DatePicker, Row, Col, Space, Checkbox, Typography, Button, Badge, Table, Radio } from "antd";
import dayjs from "dayjs";
import { useState, useEffect, useMemo } from "react";
import { getAllCustomers, getAllDispatchers, getAllOrders } from "../utils/dbUtils";
import type { Order } from "../types/order.ts";
import type { MarkerData } from "../types/markers";
import { setMarkersList } from "../utils/markersUtils.ts";
import type { Customer } from "../types/customer.ts";

import { BatchUploadModal } from "../components/batch-upload";
import { useSelector, useDispatch } from "react-redux";
import { setDate, setTimePeriod, setSelectedOrders } from "../store/orderSlice.ts";
import type { RootState } from "../store";
import SelectedOrderModal from "../components/SelectedOrderModal.tsx";
import {sortOrders} from "../utils/sortingUtils.ts";

type TimePeriod = "Morning" | "Afternoon" | "Evening";

const { Text } = Typography;

export default function ViewOrders({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const dispatch = useDispatch();
  const selectedOrders = useSelector((state: RootState) => state.order.selectedOrders);
  const date = useSelector((state: RootState) => state.order.date);
  const timePeriod = useSelector((state: RootState) => state.order.timePeriod);
  const [status, setStatus] = useState("All");
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSelectedOrderModal, setIsSelectedOrderModal] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

  console.log("selectedOrders", JSON.parse(JSON.stringify(selectedOrders)))

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: "10%",
    },
    {
      title: "Delivery Time",
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
      title: "Address",
      dataIndex: "detailedAddress",
      key: "detailedAddress",
      width: "50%",
      render: (detailedAddress: string, record: Order) => {
        return `${detailedAddress}, ${record.area}`;
      },
    },
    {
      title: "Status",
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
      const sortedOrders = sortOrders([...selectedOrders, record])
      dispatch(setSelectedOrders(sortedOrders));
    } else {
      setSelectedRowIds(selectedRowIds.filter((id) => id !== record.id));
      dispatch(
        setSelectedOrders(selectedOrders.filter((order) => order.id !== record.id))
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
      const sortedOrders = sortOrders([...selectedOrders, ...changeRows])
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
  const timeOptions: TimePeriod[] = ["Morning", "Afternoon", "Evening"]
  const statusOptions = ["All", "Complete", "Incomplete"];

  // Fetch orders and customers from Supabase
  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, [isUploadModalOpen]);

  useEffect(() => {
    setSelectedRowIds(selectedOrders.map(order => order.id));
  }, [selectedOrders]);

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
      return matchesDate && matchesTimePeriod && matchesStatus;
    });
  }, [orders, date, timePeriod, status]);

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
      <Col style={{ width: "100%", display: "flex", flexDirection: "column" }}>
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
              Bulk Import Orders (Upload JSON/CSV)
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
              Time:
            </Text>
            <Checkbox.Group
              options={timeOptions}
              defaultValue={timePeriod}
              onChange={(values: TimePeriod[]) =>
                dispatch(setTimePeriod(values))
              }
            />
          </Row>

          <Row>
            <Text strong style={{ marginRight: 20 }}>
              Status:
            </Text>
            <Radio.Group
              options={statusOptions}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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
          <Row justify="end" style={{ marginBottom: 8 }}>
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
                Selected Orders
              </Button>
            </Badge>
          </Row>

          <SelectedOrderModal
            orders={selectedOrders}
            isVisible={isSelectedOrderModal}
            setVisibility={setIsSelectedOrderModal}
            setSelectedRowIds={setSelectedRowIds}
          />

          <div style={{ flex: 1, overflow: "auto" }}>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={sortedOrders}
              rowSelection={rowSelection}
              scroll={{ y: "calc(100vh - 330px)" }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} orders`,
                position: ["bottomCenter"],
              }}
              style={{ maxWidth: 650 }}
            />
          </div>
        </div>
      </Col>
    </Row>
  );
}

ViewOrders.needMap = true;
