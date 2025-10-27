import { Card, Typography, Row, Col, Button } from "antd";
import { useEffect, useState } from "react";
import { getAllDispatchers } from "../utils/dbUtils";
import type { Dispatcher } from "../types/dispatchers";
import DispatcherModal from "../components/DispatcherModal";
import { sortDispatchers } from "../utils/sortingUtils";

const { Text } = Typography;

export default function SetDispatcher() {
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedDispatcher, setSelectedDispatcher] = useState<
    Dispatcher | undefined
  >();

  useEffect(() => {
    fetchDispatchers();
  }, []);

  const fetchDispatchers = async () => {
    const dispatchers = await getAllDispatchers();
    console.log(dispatchers);
    if (dispatchers) {
      const sortedDispatchers = sortDispatchers(dispatchers);
      setDispatchers(sortedDispatchers);
    }
  };

  const handleAddDispatcher = () => {
    setModalMode("add");
    setSelectedDispatcher(undefined);
    setModalVisible(true);
  };

  const handleEditDispatcher = (dispatcher: Dispatcher) => {
    setModalMode("edit");
    setSelectedDispatcher(dispatcher);
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setSelectedDispatcher(undefined);
  };

  const handleModalSuccess = () => {
    fetchDispatchers(); // 刷新dispatcher列表
  };

  return (
    <Card title="Dispatchers" style={{ maxWidth: "70%", margin: "0 auto" }}>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={4}>
          <Text strong>Dispatcher's Name</Text>
        </Col>
        <Col span={10}>
          <Text strong>Active Day</Text>
        </Col>
        <Col span={7}>
          <Text strong>Responsible Area</Text>
        </Col>
        <Col span={3}>
          <Text strong>Actions</Text>
        </Col>
      </Row>

      {dispatchers.map((dispatcher) => (
        <Row
          key={dispatcher.id}
          align="middle"
          gutter={12}
          style={{
            marginBottom: 12,
            padding: "8px 0",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Col span={4}>
            <Text>{dispatcher.name}</Text>
          </Col>
          <Col span={10}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", fontSize: "12px" }}>
              {(() => {
                const activeDay = dispatcher.activeDay || {};

                if (Object.keys(activeDay).length === 0) {
                  return <Text type="secondary" style={{ fontSize: "12px" }}>No active days</Text>;
                }

                const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

                // Separate days into two groups: full periods and partial periods
                const fullPeriodDays: [string, string[]][] = [];
                const partialPeriodDays: [string, string[]][] = [];

                Object.entries(activeDay).forEach(([day, periods]) => {
                  const periodList = periods as string[];
                  if (periodList.length === 3) {
                    fullPeriodDays.push([day, periodList]);
                  } else {
                    partialPeriodDays.push([day, periodList]);
                  }
                });

                // Sort both groups by day order
                fullPeriodDays.sort(([dayA], [dayB]) => dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB));
                partialPeriodDays.sort(([dayA], [dayB]) => dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB));

                // Combine: full periods first, then partial periods
                const sortedDays = [...fullPeriodDays, ...partialPeriodDays];

                return sortedDays.map(([day, periods]) => {
                  const periodList = periods as string[];
                  const isAllPeriods = periodList.length === 3;

                  // Display format: "Mon" (all periods) or "Sat: Morning / Afternoon" (partial)
                  const displayText = isAllPeriods
                    ? day
                    : `${day}: ${periodList.join(" / ")}`;

                  return (
                    <div
                      key={day}
                      style={{
                        padding: "2px 6px",
                        backgroundColor: isAllPeriods ? "#52c41a" : "#1890ff",
                        color: "white",
                        borderRadius: "4px",
                      }}
                    >
                      {displayText}
                    </div>
                  );
                });
              })()}
            </div>
          </Col>
          <Col span={7}>
            <div style={{ maxHeight: "60px", overflow: "hidden" }}>
              {dispatcher.responsibleArea?.map((area) => (
                <div key={area[1]} style={{ fontSize: "12px", color: "#666" }}>
                  {area[1]}
                </div>
              ))}
            </div>
          </Col>
          <Col span={3}>
            <Button
              type="link"
              size="small"
              onClick={() => handleEditDispatcher(dispatcher)}
            >
              Edit
            </Button>
          </Col>
        </Row>
      ))}

      <Row style={{ marginTop: 16 }}>
        <Col>
          <Button type="primary" onClick={handleAddDispatcher}>
            Add Dispatcher
          </Button>
        </Col>
      </Row>

      <DispatcherModal
        visible={modalVisible}
        mode={modalMode}
        dispatcher={selectedDispatcher}
        onCancel={handleModalCancel}
        onSuccess={handleModalSuccess}
      />
    </Card>
  );
}

SetDispatcher.needMap = false;
