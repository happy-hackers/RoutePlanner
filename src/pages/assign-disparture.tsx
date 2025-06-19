import { Select, Button, Row, Col, Space, message } from "antd";
import { useState, useEffect } from "react";
import Dispatcherform from "../components/Dispatcherform";
import type { Dispatcher } from "../types/dispatchers";
import { getAllDispatchers, getAllOrders } from "../utils/dbUtils";
import type { MarkerData } from "../types/markers";
import type { Order } from "../types/order";
import { getRegionByPostcode } from "../utils/regionUtils";
import setMarkersList from "../utils/markersUtils";

export default function AssignDispatchers({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [responsibleArea, setResponsibleArea] = useState<string[]>([]);
  console.log("responsibleArea", responsibleArea);

  // Combined useEffect to fetch both orders and dispatchers
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch orders and dispatchers in parallel
        const [ordersData, dispatchersData] = await Promise.all([
          getAllOrders(),
          getAllDispatchers(),
        ]);

        if (ordersData) {
          setOrders(ordersData);
        }

        if (dispatchersData) {
          setDispatchers(dispatchersData);
          console.log("dispatchersData", dispatchersData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        message.error("Failed to load data. Please try again.");
      }
    };

    fetchData();
  }, []);

  const dispatchersOption = dispatchers.map((dispatcher) => ({
    value: dispatcher.id,
    label: dispatcher.name,
  }));

  const handleAutoAssign = () => {
    if (selectedId) {
      setResponsibleArea(dispatchers[selectedId - 1].responsibleArea);
    }
    const markersbyregion = orders.map((order) => {
      const region = getRegionByPostcode(order.postcode);
      let color = "red";
      switch (region) {
        case "Inner Melbourne":
          color = "red";
          break;
        case "Northern Suburbs":
          color = "blue";
          break;
        case "Eastern & South-Eastern Suburbs":
          color = "green";
          break;
        case "Western Suburbs":
          color = "orange";
          break;
        default:
          color = "red";
          break;
      }
      return {
        ...order,
        color,
      };
    });
    setMarkers(setMarkersList(markersbyregion));
  };

  return (
    <Row style={{ height: "100%" }}>
      <Col>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space direction="horizontal" size="middle">
            <Select
              defaultValue={null}
              onChange={setSelectedId}
              options={dispatchersOption}
            />
            <Button type="primary" onClick={handleAutoAssign}>
              Auto Assign
            </Button>
          </Space>
          <Dispatcherform />
        </Space>
      </Col>
    </Row>
  );
}

AssignDispatchers.needMap = true;
