import { useSelector, useDispatch } from "react-redux";
import {
  Card,
  Select,
  Checkbox,
  Space,
  Typography,
  Row,
  Col,
  Button,
} from "antd";
import {
  toggleDay,
  updateArea,
  resetDispatchers,
} from "../features/disparturers";
import type { RootState } from "../store";
import { useEffect, useState } from "react";

const { Option } = Select;
const { Text } = Typography;

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const areas = ["City", "South East", "West"];

export default function SetDispatcher() {
  const dispatch = useDispatch();
  const dispatchers = useSelector((state: RootState) => state.dispatchers);

  const [changedDispatcherIds, setChangedDispatcherIds] = useState<number[]>(
    []
  );

  useEffect(() => {
    // When leaving this page, reset the state of dispatchers based on the data in database, otherwise the state is not consistent to database
    return () => {
      const fetchDispatchers = async () => {
        const res = await fetch("http://localhost:4000/dispatcher");
        const result = await res.json();
        dispatch(resetDispatchers(result));
      };
      fetchDispatchers();
    };
  }, []);
  const markAsChanged = (id: number) => {
    setChangedDispatcherIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };
  const handleToggleDay = (dispatcherId: number, day: string) => {
    dispatch(toggleDay({ id: dispatcherId, day }));
    markAsChanged(dispatcherId);
  };

  const handleUpdateArea = (dispatcherId: number, value: string[]) => {
    dispatch(updateArea({ id: dispatcherId, areas: value }));
    markAsChanged(dispatcherId);
  };

  const handleSaveChanges = async () => {
    try {
      // Get the current dispatcher data based on the changed IDs
      const changedDispatchers = changedDispatcherIds.map(
        (id) => dispatchers.filter((dispatcher) => dispatcher.id === id)[0]
      );
      const response = await fetch(
        "http://localhost:4000/dispatcher/set-dispatchers",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changedDispatchers),
        }
      );

      const result = await response.json();
      if (response.status === 207) {
        console.warn("Partial success:", result.failed);
        alert(result.message);
      } else if (response.ok) {
        console.log("All updates successful", result.data);
        alert(result.message);
      } else {
        console.error("Request failed", result.error);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
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
                  checked={dispatcher.activeDay.includes(day)}
                  onChange={() => handleToggleDay(dispatcher.id, day)}
                >
                  {day.slice(0, 3)}
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
      <Button
        type="primary"
        onClick={handleSaveChanges}
        disabled={changedDispatcherIds.length === 0}
      >
        Save Changes
      </Button>
    </Card>
  );
}

SetDispatcher.needMap = false;
