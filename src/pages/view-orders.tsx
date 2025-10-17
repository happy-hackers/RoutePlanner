import Orderform from "../components/Orderform";
import NewOrderModal from "../components/NewOrderModal";
import { DatePicker, Row, Col, Space, Checkbox, Typography, Button } from "antd";
import dayjs from "dayjs";
import { useState, useEffect, useMemo } from "react";
import { getAllCustomers, getAllOrders } from "../utils/dbUtils";
import type { Order, OrderStatus } from "../types/order.ts";
import type { MarkerData } from "../types/markers";
import { setMarkersList } from "../utils/markersUtils.ts";
import type { Customer } from "../types/customer.ts";

type TimePeriod = "Morning" | "Afternoon" | "Evening";

const { Text } = Typography;
import Upload from "../components/UploadModal.tsx";
import { useSelector, useDispatch } from "react-redux";
import { setDate, setTimePeriod, setStatus } from "../store/orderSlice.ts";
import type { RootState } from "../store";

export default function ViewOrders({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const dispatch = useDispatch();
  const date = useSelector((state: RootState) => state.order.date);
  const timePeriod = useSelector((state: RootState) => state.order.timePeriod);
  const status = useSelector((state: RootState) => state.order.status);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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

  useEffect(() => {
    setMarkers(setMarkersList(filteredOrders));
  }, [filteredOrders, setMarkers]);

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
            <Upload isOpen={isUploadModalOpen} setOpen={setIsUploadModalOpen} />
          </Space>
          <DatePicker
            defaultValue={date}
            onChange={(value) => dispatch(setDate(value))}
            style={{ width: "300px" }}
            format="YYYY-MM-DD"
          />
          <Row>
            <Text strong style={{ marginRight: "20px" }}>Time:</Text>
            <Checkbox.Group options={timeOptions} defaultValue={timePeriod} onChange={(values: TimePeriod[]) => dispatch(setTimePeriod(values))} />
          </Row>
          <Row>
            <Text strong style={{ marginRight: "20px" }}>Status:</Text>
            <Checkbox.Group options={stateOptions} defaultValue={status} onChange={(values: OrderStatus[]) => dispatch(setStatus(values))} />
          </Row>
          <Orderform orders={filteredOrders} onOrderRefetch={fetchOrders} />
        </Space>
      </Col>
    </Row>
  );
}

ViewOrders.needMap = true;
