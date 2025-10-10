import Orderform from "../components/Orderform";
import NewOrderModal from "../components/NewOrderModal";
import { Button, DatePicker, Row, Col, Space, Checkbox, Typography } from "antd";
import dayjs from "dayjs";
import { useState, useEffect, useMemo } from "react";
import { getAllCustomers, getAllOrders } from "../utils/dbUtils";
import type { Order } from "../types/order.ts";
import type { MarkerData } from "../types/markers";
import { setMarkersList } from "../utils/markersUtils.ts";
import type { Customer } from "../types/customer.ts";

type TimePeriod = "Morning" | "Afternoon" | "Evening";
type OrderState = "Pending" | "Assigned" | "In Progress" | "Delivered" | "Cancelled";

const { Text } = Typography;

export default function ViewOrders({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod[]>(["Morning", "Afternoon", "Evening"]);
  const [orderState, setOrderState] = useState<OrderState[]>(["In Progress"]);
  const [date, setDate] = useState(dayjs());
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

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
  const stateOptions: OrderState[] = ["In Progress", "Delivered"];

  // Fetch orders and customers from Supabase
  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, []);

  // Use useMemo to cache filtered orders and prevent infinite re-renders
  const filteredOrders = useMemo(() => {
    if (date === null) 
      return orders.filter((order) => {
      const isSameTimePeriod = timePeriod.includes(order.time);
      const isSameState = orderState.includes(order.state);
      return isSameTimePeriod && isSameState;
    });
    else 
      return orders.filter((order) => {
        const orderDate = dayjs(order.date);
        const isSameDate = orderDate.isSame(date, "day");
        const isSameTimePeriod = timePeriod.includes(order.time);
        const isSameState = orderState.includes(order.state);
        return isSameDate && isSameTimePeriod && isSameState;
      });
  }, [orders, date, timePeriod, orderState]);

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
            <Button type="default">Upload</Button>
          </Space>
          <DatePicker
            defaultValue={dayjs()}
            onChange={(value) => setDate(value)}
            style={{ width: "300px" }}
          />
          <Row>
            <Text strong style={{ marginRight: "20px" }}>Time:</Text>
            <Checkbox.Group options={timeOptions} defaultValue={["Morning", "Afternoon", "Evening"]} onChange={(values: TimePeriod[]) => setTimePeriod(values)} />
          </Row>
          <Row>
            <Text strong style={{ marginRight: "20px" }}>State:</Text>
            <Checkbox.Group options={stateOptions} defaultValue={["In Progress"]} onChange={(values: OrderState[]) => setOrderState(values)} />
          </Row>
          <Orderform orders={filteredOrders} onOrderRefetch={fetchOrders} />
        </Space>
      </Col>
    </Row>
  );
}

ViewOrders.needMap = true;
