import { useSelector, useDispatch } from "react-redux";
import { Card, Select, Checkbox, Space, Typography, Row, Col } from "antd";
import { toggleDay, updateArea } from "../features/disparturers";
import type { RootState } from "../store";

const { Option } = Select;
const { Text } = Typography;

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const areas = ["City", "South East", "West"];

export default function SetDispatcher() {
  const dispatch = useDispatch();
  const dispatchers = useSelector((state: RootState) => state.dispatchers);

  const handleToggleDay = (dispatcherId: number, day: string) => {
    dispatch(toggleDay({ id: dispatcherId, day }));
  };

  const handleUpdateArea = (dispatcherId: number, value: string[]) => {
    dispatch(updateArea({ id: dispatcherId, areas: value }));
  };

  return (
    <Card title="Drivers" style={{ maxWidth: "70%", margin: "0 auto" }}>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={3}>
          <Text>Driver's Name</Text>
        </Col>
        <Col span={14}>
          <Text>Active Day</Text>
        </Col>
        <Col span={7}>
          <Text>Responsible Area</Text>
        </Col>
      </Row>
      {dispatchers.map((dispatcher) => (
        <Row
          key={dispatcher.id}
          align="middle"
          gutter={12}
          style={{ marginBottom: 12 }}
        >
          <Col span={3}>
            <Text>{dispatcher.name}</Text>
          </Col>
          <Col span={14}>
            <Space>
              {days.map((day) => (
                <Checkbox
                  key={day}
                  checked={dispatcher.Activeday.includes(day)}
                  onChange={() => handleToggleDay(dispatcher.id, day)}
                >
                  {day[0]}
                </Checkbox>
              ))}
            </Space>
          </Col>
          <Col span={7}>
            <Select
              mode="multiple"
              value={dispatcher.responsibleArea}
              onChange={(val) => handleUpdateArea(dispatcher.id, val)}
              style={{ width: "100%" }}
              placeholder="Select area"
            >
              {areas.map((area) => (
                <Option key={area} value={area}>
                  {area}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      ))}
    </Card>
  );
}

SetDispatcher.needMap = false;
