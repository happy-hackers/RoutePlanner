import Orderform from "../components/Orderform";
import NewCustomerModal from "../components/NewCustomerModal";
import { Button, DatePicker, Radio, Row, Col, Space } from "antd";
import dayjs from "dayjs";
import { useState, useEffect, useMemo } from "react";
import { getAllOrders } from "../utils/dbUtils";
import type { Order } from "../types/order.ts";
import type { MarkerData } from "../types/markers";
import { setMarkersList } from "../utils/markersUtils.ts";

type TimePeriod = "Morning" | "Afternoon" | "Evening";

export default function ViewCustomers({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("Afternoon");
  const [date, setDate] = useState(dayjs());
  const [orders, setOrders] = useState<Order[]>([]);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (time: string, record: Order) => {
        const date = dayjs(record.date).format("YYYY-MM-DD");
        const timeDisplay = time.charAt(0).toUpperCase() + time.slice(1);
        return `${date} ${timeDisplay}`;
      },
    },
    {
      title: "Postcode",
      dataIndex: "postcode",
      key: "postcode",
    },
  ];

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
            <Button type="primary" onClick={() => setShowNewCustomerModal(true)}>
              Add a new customer
            </Button>
            {showNewCustomerModal ? (
              <NewCustomerModal
                isVisible={showNewCustomerModal}
                onConfirm={() =>
                  setShowNewCustomerModal(false)
                }
                onCancel={() =>
                  setShowNewCustomerModal(false)
                }
              />
            ) : null}
          </Space>
          <DatePicker
            defaultValue={dayjs()}
            onChange={(value) => setDate(value)}
            style={{ width: "100%" }}
          />
          <Radio.Group
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
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

ViewCustomers.needMap = false;
