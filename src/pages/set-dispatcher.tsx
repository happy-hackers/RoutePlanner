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
//import type { RootState } from "../store";
import { useEffect, useState } from "react";
import { getAllDispatchers, updateDispatchers } from "../utils/dbUtils";
import type { Dispatcher } from "../types/dispatchers";

const { Option } = Select;
const { Text } = Typography;

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const areas = [
  "Inner Melbourne",
  "Northern Suburbs",
  "Eastern & South-Eastern Suburbs",
  "Western Suburbs",
];

export default function SetDispatcher() {
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [changedDispatcherIds, setChangedDispatcherIds] = useState<number[]>(
    []
  );
  useEffect(() => {
    const fetchDispatchers = async () => {
      const dispatchers = await getAllDispatchers();
      console.log(dispatchers)
      if (dispatchers) {
        setDispatchers(dispatchers);
      }
    };

    fetchDispatchers();
    
    // When leaving this page, reset the state of dispatchers based on the data in database, otherwise the state is not consistent to database
    /*return () => {
      const fetchDispatchers = async () => {
        const res = await fetch("http://localhost:4000/dispatcher");
        const result = await res.json();
        dispatch(resetDispatchers(result));
      };
      fetchDispatchers();
    };*/
  }, []);
  const markAsChanged = (id: number) => {
    setChangedDispatcherIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };
  const handleToggleDay = (dispatcherId: number, day: string) => {
    setDispatchers((prevDispatchers) =>
      prevDispatchers.map((dispatcher) => {
        if (dispatcher.id !== dispatcherId) return dispatcher;
    
        const activeDay = [...dispatcher.activeDay]; // clone the array
        const dayIndex = activeDay.indexOf(day);
    
        if (dayIndex === -1) {
          activeDay.push(day);
        } else {
          activeDay.splice(dayIndex, 1);
        }
    
        return {
          ...dispatcher,
          activeDay,
        };
      })
    );
    markAsChanged(dispatcherId);
  };

  const handleUpdateArea = (dispatcherId: number, areas: string[]) => {
    setDispatchers((prevDispatchers) =>
      prevDispatchers.map((dispatcher) =>
        dispatcher.id === dispatcherId
          ? { ...dispatcher, responsibleArea: areas }
          : dispatcher
      )
    );
    markAsChanged(dispatcherId);
  };

  const handleSaveChanges = async () => {
    try {
      // Get the current dispatcher data based on the changed IDs
      const changedDispatchers = changedDispatcherIds.map(
        (id) => dispatchers.filter((dispatcher) => dispatcher.id === id)[0]
      );
      const result = await updateDispatchers(changedDispatchers);
      if (result.success && result.data) {
        alert("Dispatcher updated successfully!");
      } else {
        console.error("Failed to update dispatcher:", result.error);
        alert(`Failed to update dispatcher: ${result.error}`);
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
                  checked={dispatcher.activeDay?.includes(day)}
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
