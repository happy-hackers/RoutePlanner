import Orderform from "../components/Orderform";
import NewOrderModal from "../components/NewOrderModal";
import { Button, DatePicker, Radio, Row, Col, Space } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

type TimePeriod = "afternoon" | "evening";

export default function ViewOrders() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("afternoon");
  const [date, setDate] = useState(dayjs());
  const orders = useSelector((state: RootState) => state.orders);

  return (
    <Row style={{ height: "100%" }}>
      <Col>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space direction="horizontal" size="middle">
            <NewOrderModal context={{ Date: date, Time: timePeriod }} />
            <Button type="default">Upload</Button>
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
            <Radio.Button value="afternoon" style={{ width: "50%" }}>
              Afternoon
            </Radio.Button>
            <Radio.Button value="evening" style={{ width: "50%" }}>
              Evening
            </Radio.Button>
          </Radio.Group>
          <Orderform orders={orders} />
        </Space>
      </Col>
    </Row>
  );
}

ViewOrders.needMap = true;
