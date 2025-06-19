import { Select, Button, Row, Col, Space, message } from "antd";
import { useState, useEffect } from "react";
import Dispatcherform from "../components/Dispatcherform";
import type { Dispatcher } from "../types/dispatchers";
import {
  getAllDispatchers,
  getAllOrders,
  assignDispatcher,
} from "../utils/dbUtils";
import type { MarkerData } from "../types/markers";
import type { Order } from "../types/order";
import { getRegionByPostcode } from "../utils/regionUtils";
import { addMarkerwithColor } from "../utils/markersUtils";

// Color mapping for different regions
const REGION_COLORS: Record<string, string> = {
  "Inner Melbourne": "red",
  "Northern Suburbs": "blue",
  "Eastern & South-Eastern Suburbs": "green",
  "Western Suburbs": "orange",
};

export default function AssignDispatchers({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

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

  const dispatchersOption = [
    { value: null, label: "All Dispatchers" },
    ...dispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  const handleAutoAssign = async (id?: number) => {
    const dispatcherId = id ?? selectedId;

    // Only allow auto assign when "All Dispatchers" is selected (dispatcherId is null)
    if (dispatcherId !== null) {
      message.warning(
        "Auto Assign is only available when 'All Dispatchers' is selected"
      );
      return;
    }

    setIsAssigning(true);

    try {
      // Get all dispatchers and their responsible areas
      const dispatcherAssignments = dispatchers.map((dispatcher) => ({
        dispatcher,
        responsibleAreas: dispatcher.responsibleArea,
      }));

      // Group orders by region and assign to appropriate dispatchers
      const ordersToAssign = orders
        .map((order) => {
          const region = getRegionByPostcode(order.postcode);
          const assignedDispatcher = dispatcherAssignments.find((assignment) =>
            assignment.responsibleAreas.includes(region)
          );

          return {
            order,
            dispatcherId: assignedDispatcher?.dispatcher.id || null,
            region,
          };
        })
        .filter((item) => item.dispatcherId !== null);

      console.log(
        `Found ${ordersToAssign.length} orders to assign out of ${orders.length} total orders`
      );

      // Update database for each order
      const updatePromises = ordersToAssign.map(async (item) => {
        const result = await assignDispatcher(
          item.order.id,
          item.dispatcherId!
        );
        if (!result.success) {
          console.error(
            `Failed to assign order ${item.order.id} to dispatcher ${item.dispatcherId}:`,
            result.error
          );
          return {
            order: item.order,
            dispatcherId: item.dispatcherId,
            region: item.region,
            success: false,
            error: result.error,
          };
        }
        return {
          order: item.order,
          dispatcherId: item.dispatcherId,
          region: item.region,
          success: true,
        };
      });

      const results = await Promise.all(updatePromises);
      const successfulAssignments = results.filter((r) => r.success);
      const failedAssignments = results.filter((r) => !r.success);

      // Group successful assignments by dispatcher for better reporting
      const assignmentsByDispatcher = successfulAssignments.reduce(
        (acc, item) => {
          const dispatcherName =
            dispatchers.find((d) => d.id === item.dispatcherId)?.name ||
            "Unknown";
          if (!acc[dispatcherName]) {
            acc[dispatcherName] = [];
          }
          acc[dispatcherName].push(item);
          return acc;
        },
        {} as Record<string, typeof successfulAssignments>
      );

      // Show detailed results
      if (successfulAssignments.length > 0) {
        const summary = Object.entries(assignmentsByDispatcher)
          .map(([name, items]) => `${name}: ${items.length} orders`)
          .join(", ");
        message.success(
          `Successfully assigned ${successfulAssignments.length} orders: ${summary}`
        );
      }

      if (failedAssignments.length > 0) {
        message.error(`Failed to assign ${failedAssignments.length} orders`);
        console.error("Failed assignments:", failedAssignments);
      }

      // Refresh orders data to get updated assignments
      const updatedOrders = await getAllOrders();
      if (updatedOrders) {
        setOrders(updatedOrders);
      }

      // Create markers for all orders with their assigned colors
      const ordersToShow = updatedOrders || orders;
      const allMarkers = ordersToShow
        .map((order) => {
          const region = getRegionByPostcode(order.postcode);
          const color = REGION_COLORS[region] || "red";
          return addMarkerwithColor(order, color);
        })
        .filter((marker): marker is MarkerData => marker !== null);

      setMarkers(allMarkers);
    } catch (error) {
      console.error("Error during auto assignment:", error);
      message.error("Failed to assign orders. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Row style={{ height: "100%" }}>
      <Col>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space direction="horizontal" size="middle">
            <Select
              defaultValue={null}
              onChange={(id: number) => {
                setSelectedId(id);
                // Only update markers when selecting, don't auto assign
                if (id) {
                  const selectedDispatcher = dispatchers.find(
                    (d) => d.id === id
                  );
                  if (selectedDispatcher) {
                    const responsibleAreas = selectedDispatcher.responsibleArea;
                    const filteredMarkers = orders
                      .filter((order) => {
                        const region = getRegionByPostcode(order.postcode);
                        return responsibleAreas.includes(region);
                      })
                      .map((order) => {
                        const region = getRegionByPostcode(order.postcode);
                        const color = REGION_COLORS[region] || "red";
                        return addMarkerwithColor(order, color);
                      })
                      .filter(
                        (marker): marker is MarkerData => marker !== null
                      );
                    setMarkers(filteredMarkers);
                  }
                } else {
                  // Show all orders when "All Dispatchers" is selected
                  const allMarkers = orders
                    .map((order) => {
                      const region = getRegionByPostcode(order.postcode);
                      const color = REGION_COLORS[region] || "red";
                      return addMarkerwithColor(order, color);
                    })
                    .filter((marker): marker is MarkerData => marker !== null);
                  setMarkers(allMarkers);
                }
              }}
              options={dispatchersOption}
            />
            <Button
              type="primary"
              onClick={() => handleAutoAssign()}
              loading={isAssigning}
              disabled={selectedId !== null}
            >
              {isAssigning ? "Assigning..." : "Auto Assign"}
            </Button>
          </Space>
          <Dispatcherform
            selectedDispatcher={
              selectedId
                ? dispatchers.find((d) => d.id === selectedId) || null
                : null
            }
            orders={orders}
          />
        </Space>
      </Col>
    </Row>
  );
}

AssignDispatchers.needMap = true;
