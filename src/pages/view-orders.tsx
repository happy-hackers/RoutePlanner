import Orderform from "../components/Orderform";
import NewOrderModal from "../components/NewOrderModal";
import { DatePicker, Radio, Row, Col, Space } from "antd";
import dayjs from "dayjs";
import { useState, useEffect, useMemo } from "react";
import { getAllOrders } from "../utils/dbUtils";
import type { Order } from "../types/order.ts";
import type { MarkerData } from "../types/markers";
import { setMarkersList } from "../utils/markersUtils.ts";
import Upload from "../components/UploadModal.tsx";
import { useSelector, useDispatch } from "react-redux";
import { setDate, setTimePeriod } from "../store/timeSlice";
import type { RootState } from "../store";

export default function ViewOrders({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const dispatch = useDispatch();
  const date = useSelector((state: RootState) => state.time.date);
  const timePeriod = useSelector((state: RootState) => state.time.timePeriod);
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    const ordersData = await getAllOrders();
    if (ordersData) {
      setOrders(ordersData);
    }
  };

  // Fetch orders from Supabase
  useEffect(() => {
    fetchOrders();
  }, []);

  // Use useMemo to cache filtered orders and prevent infinite re-renders
  const filteredOrders = useMemo(() => {
    if (date === null) return orders;

    return orders.filter((order) => {
      const orderDate = dayjs(order.date);
      const isSameDate = orderDate.isSame(date, "day");
      const isSameTimePeriod = order.time === timePeriod;
      return isSameDate && isSameTimePeriod;
    });
  }, [orders, date, timePeriod]);

  useEffect(() => {
    setMarkers(setMarkersList(filteredOrders));
  }, [filteredOrders, setMarkers]);

  return (
    <Row style={{ height: "100%" }}>
      <Col>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space direction="horizontal" size="middle">
            <NewOrderModal
              context={{ Date: date, Time: timePeriod }}
              fetchOrders={fetchOrders}
            />
            <Upload />
          </Space>
          <DatePicker
            defaultValue={dayjs()}
            onChange={(value) => dispatch(setDate(value))}
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
          />
          <Radio.Group
            value={timePeriod}
            onChange={(e) => dispatch(setTimePeriod(e.target.value))}
            optionType="button"
            style={{ width: "100%" }}
          >
            <Radio.Button value="Morning" style={{ width: "33.33%" }}>
              Morning
            </Radio.Button>
            <Radio.Button value="Afternoon" style={{ width: "33.33%" }}>
              Afternoon
            </Radio.Button>
            <Radio.Button value="Evening" style={{ width: "33.33%" }}>
              Evening
            </Radio.Button>
          </Radio.Group>
          <Orderform orders={filteredOrders} />
        </Space>
      </Col>
    </Row>
  );
}

ViewOrders.needMap = true;
