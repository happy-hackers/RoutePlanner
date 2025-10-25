import NewOrderModal from "../components/NewOrderModal";
import { DatePicker, Row, Col, Space, Checkbox, Typography, Button, Badge, Table } from "antd";
import dayjs from "dayjs";
import { useState, useEffect, useMemo } from "react";
import { getAllCustomers, getAllDispatchers, getAllOrders } from "../utils/dbUtils";
import type { Order, OrderStatus } from "../types/order.ts";
import type { MarkerData } from "../types/markers";
import { setMarkersList } from "../utils/markersUtils.ts";
import type { Customer } from "../types/customer.ts";

import Upload from "../components/UploadModal.tsx";
import { useSelector, useDispatch } from "react-redux";
import { setDate, setTimePeriod, setStatus, setLoadedOrders } from "../store/orderSlice.ts";
import type { RootState } from "../store";
import LoadedOrderModal from "../components/LoadedOrderModal.tsx";
import {sortOrders} from "../utils/sortingUtils.ts";

type TimePeriod = "Morning" | "Afternoon" | "Evening";

const { Text } = Typography;

export default function ViewOrders({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const dispatch = useDispatch();
  const loadedOrders = useSelector((state: RootState) => state.order.loadedOrders);
  const date = useSelector((state: RootState) => state.order.date);
  const timePeriod = useSelector((state: RootState) => state.order.timePeriod);
  const status = useSelector((state: RootState) => state.order.status);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoadedOrderModal, setIsLoadedOrderModal] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

  console.log("loadedOrders", JSON.parse(JSON.stringify(loadedOrders)))

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
        let color = "";
        if (status === "In Progress") color = "orange";
        else if (status === "Delivered") color = "#53CC3F";

        return <span style={{ color }}>{status}</span>;
      },
      width: "20%",
    },
  ];

  const handleRowSelect = (record: Order, selected: boolean) => {
    if (selected) {
      setSelectedRowIds((prev) => [...prev, record.id]);
      const sortedOrders = sortOrders([...loadedOrders, record])
      dispatch(setLoadedOrders(sortedOrders));
    } else {
      setSelectedRowIds(selectedRowIds.filter((id) => id !== record.id));
      dispatch(
        setLoadedOrders(loadedOrders.filter((order) => order.id !== record.id))
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
      const sortedOrders = sortOrders([...loadedOrders, ...changeRows])
      dispatch(setLoadedOrders(sortedOrders));
    } else {
      setSelectedRowIds((prev) => prev.filter((id) => !changedId.includes(id)));
      dispatch(
        setLoadedOrders(
          loadedOrders.filter((order) => !changedId.includes(order.id))
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
  const stateOptions: OrderStatus[] = ["Pending", "In Progress", "Delivered"];

  // Fetch orders and customers from Supabase
  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, [isUploadModalOpen]);

  useEffect(() => {
    setSelectedRowIds(loadedOrders.map(order => order.id));
  }, [loadedOrders]);

  // Use useMemo to cache filtered orders and prevent infinite re-renders
  const filteredOrders = useMemo(() => {
    if (date === null) 
      return orders.filter((order) => {
      const isSameTimePeriod = timePeriod.includes(order.time);
      const isSameStatus = status.includes(order.status);
      return isSameTimePeriod && isSameStatus;
    });
    else 
      return orders.filter((order) => {
        const orderDate = dayjs(order.date);
        const isSameDate = orderDate.isSame(date, "day");
        const isSameTimePeriod = timePeriod.includes(order.time);
        const isSameStatus = status.includes(order.status);
        return isSameDate && isSameTimePeriod && isSameStatus;
      });
  }, [orders, date, timePeriod, status]);

  const sortedOrders = sortOrders(filteredOrders);

  useEffect(() => {
    const fetchAndSetMarkers = async () => {
      const dispatchersData = await getAllDispatchers();
      if (dispatchersData)
        setMarkers(setMarkersList(loadedOrders, dispatchersData));
    };

    fetchAndSetMarkers();
  }, [loadedOrders, setMarkers]);

  return (
    <Row style={{ height: "100%" }}>
      <Col style={{ width: "100%" }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space direction="horizontal" size="middle">
            <NewOrderModal
              date={date}
              customers={customers}
              fetchOrders={fetchOrders}
            />
            <Button type="primary" onClick={() => setIsUploadModalOpen(true)}>
              Bulk Import Orders (Upload JSON/CSV)
            </Button>
            <Upload
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
            <Text strong style={{ marginRight: "20px" }}>
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
            <Text strong style={{ marginRight: "20px" }}>
              Status:
            </Text>
            <Checkbox.Group
              options={stateOptions}
              defaultValue={status}
              onChange={(values: OrderStatus[]) => dispatch(setStatus(values))}
            />
          </Row>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Row justify="end">
              <Badge
                count={loadedOrders.length}
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
                  onClick={() => setIsLoadedOrderModal(true)}
                >
                  Loaded Orders
                </Button>
              </Badge>
            </Row>
            <LoadedOrderModal
              orders={loadedOrders}
              isVisible={isLoadedOrderModal}
              setVisibility={setIsLoadedOrderModal}
              setSelectedRowIds={setSelectedRowIds}
            />
            <Table
              rowKey="id"
              columns={columns}
              dataSource={sortedOrders}
              rowSelection={rowSelection}
              scroll={{ y: 380 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} orders`,
              }}
              style={{ maxWidth: "650px" }}
            />
          </Space>
        </Space>
      </Col>
    </Row>
  );
}

ViewOrders.needMap = true;
