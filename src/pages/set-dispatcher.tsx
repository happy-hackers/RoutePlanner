import { useState } from "react";
import {
  Card,
  Select,
  Checkbox,
  Button,
  Space,
  Typography,
  Row,
  Col,
} from "antd";

const { Option } = Select;
const { Text } = Typography;

const days = ["S", "M", "T", "W", "T", "F", "S"];
const areas = ["City", "South East", "West"];

const initialDrivers = [
  { name: "Amy", days: [1, 2, 3, 4], area: ["City", "South East"] },
  { name: "Bob", days: [1, 2, 3, 4], area: [] },
  { name: "Charles", days: [1, 2, 3, 4, 5], area: ["City"] },
];

export default function SetDispatcher() {
  const [drivers, setDrivers] = useState(initialDrivers);

  const toggleDay = (driverIndex: number, dayIndex: number) => {
    const updated = [...drivers];
    const selectedDays = updated[driverIndex].days;
    if (selectedDays.includes(dayIndex)) {
      updated[driverIndex].days = selectedDays.filter((d) => d !== dayIndex);
    } else {
      updated[driverIndex].days = [...selectedDays, dayIndex];
    }
    setDrivers(updated);
  };

  const updateArea = (driverIndex: number, value: string[]) => {
    const updated = [...drivers];
    updated[driverIndex].area = value;
    setDrivers(updated);
  };

  const addDriver = () => {
    setDrivers([
      ...drivers,
      { name: `Driver ${drivers.length + 1}`, days: [], area: [] },
    ]);
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
      {drivers.map((driver, idx) => (
        <Row key={idx} align="middle" gutter={12} style={{ marginBottom: 12 }}>
          <Col span={3}>
            <Text>{driver.name}</Text>
          </Col>
          <Col span={14}>
            <Space>
              {days.map((day, dayIdx) => (
                <Checkbox
                  key={dayIdx}
                  checked={driver.days.includes(dayIdx)}
                  onChange={() => toggleDay(idx, dayIdx)}
                >
                  {day}
                </Checkbox>
              ))}
            </Space>
          </Col>
          <Col span={7}>
            <Select
              mode="multiple"
              value={driver.area}
              onChange={(val) => updateArea(idx, val)}
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
      <Button type="primary" onClick={addDriver}>
        New Driver
      </Button>
    </Card>
  );
}

SetDispatcher.needMap = false;
