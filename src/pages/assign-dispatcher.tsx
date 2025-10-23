import { Select, Button, Row, Col, Space, App } from "antd";
import { useState, useEffect } from "react";
import Dispatcherform from "../components/Dispatcherform";
import type { Dispatcher } from "../types/dispatchers";
import {
  getAllDispatchers,
  updateOrder,
  getInProgressOrdersByDispatcherId,
} from "../utils/dbUtils";
import type { MarkerData } from "../types/markers";
import type { Order } from "../types/order";
import { addMarkerwithColor, setMarkersList } from "../utils/markersUtils";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { setLoadedOrders } from "../store/orderSlice";

export default function AssignDispatchers({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const { message } = App.useApp();
  const dispatch = useDispatch();
  const loadedOrders = useSelector((state: RootState) => state.order.loadedOrders);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  //console.log("loadedOrders", JSON.parse(JSON.stringify(loadedOrders)))

  useEffect(() => {
    const fetchDispatchers = async () => {
      try {
        const dispatchersData = await getAllDispatchers();
        if (dispatchersData) {
          setDispatchers(dispatchersData);
        }
      } catch (error) {
        console.error("Error fetching dispatchers:", error);
        message.error("Failed to load dispatchers.");
      }
    };

    fetchDispatchers();
  }, []);

  const dispatchersOption = [
    { value: null, label: "All Dispatchers" },
    ...dispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  const getDispatcherWithLeastOrders = async (dispatchers: Dispatcher[]) => {
    let minDispatcher: Dispatcher | null = null;
    let minOrders = Infinity;

    for (const dispatcher of dispatchers) {
      const orders = await getInProgressOrdersByDispatcherId(dispatcher.id);
      if (orders) {
        const orderCount = orders.length;
        if (orderCount < minOrders) {
          minOrders = orderCount;
          minDispatcher = dispatcher;
        }
      }
    }
    return minDispatcher;
  }

  const assignOrders = async () => {
    setIsAssigning(true);
    if (dispatchers.length === 0) 
      return

    let newLoadedOrders = [...loadedOrders]

    for (const order of loadedOrders) {
      // Skip already assigned orders
      if (order.dispatcherId) {
        continue;
      }
      const customer = order.customer;
      if (!customer) {
        console.warn(`No customer attached to order ${order.id}`);
        setIsAssigning(false);
        continue;
      }

      let matchedDispatcher;

      // Try to find a dispatcher by district first
      let matchedDispatchers = dispatchers.filter((d) =>
        d.responsibleArea.some(
          ([_area, district]) =>
            district.toLowerCase() === customer.district.toLowerCase()
        )
      );
      console.log("matchedDispatchers", matchedDispatchers)

      // If there is no district matched, try to find a area
      if (matchedDispatchers.length === 0) {
        matchedDispatchers = dispatchers.filter((d) =>
          d.responsibleArea.some(
            ([area]) => area.toLowerCase() === customer.area.toLowerCase()
          )
        );
        // If no one matched, assign it to the dispatcher who has least number of in-progressed order
        // If there is only one dispatcher matched, assign the order to the person
        // If more than one dispatcher, assign it to the dispatcher who has least number of in-progressed order
        if (matchedDispatchers.length === 0) {
          matchedDispatcher = await getDispatcherWithLeastOrders(dispatchers)
        } else if (matchedDispatchers.length === 1) {
          matchedDispatcher = matchedDispatchers[0];
        } else if (matchedDispatchers.length > 1) {
          matchedDispatcher = await getDispatcherWithLeastOrders(matchedDispatchers)
        }
      } else if (matchedDispatchers.length === 1) {
        matchedDispatcher = matchedDispatchers[0];
      } else if (matchedDispatchers.length > 1) {
        console.log("length", matchedDispatchers.length)
        matchedDispatcher = await getDispatcherWithLeastOrders(matchedDispatchers)
      }

      console.log("matchedDispatcher", matchedDispatcher);

      if (matchedDispatcher) {
        const { customer, ...rest } = order;
        const updatedOrder: Order = {
          ...rest,
          dispatcherId: matchedDispatcher.id,
          status: "In Progress",
        };
        const result = await updateOrder(updatedOrder);

        if (result.success) {
          newLoadedOrders = newLoadedOrders.map((order) =>
            order.id === updatedOrder.id ? { ...updatedOrder, customer } : order
          );
          const newMarkers = setMarkersList(newLoadedOrders, dispatchers)
          setMarkers(newMarkers);
          message.success(
            `Order ${order.id} assigned to ${matchedDispatcher.name}`
          );
        } else {
          message.error(`Failed to update order ${order.id}: ${result.error}`);
        }
      } else {
        message.warning(`No dispatcher found for order ${order.id}`);
      }
    }

    dispatch(setLoadedOrders(newLoadedOrders));
    setIsAssigning(false);
  };

  return (
    <Row style={{ height: "100%" }}>
      <Col>
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Space direction="horizontal" size="middle">
            <Select
              defaultValue={null}
              onChange={(id: number) => {
                setSelectedId(id);
                // Only update markers when selecting, don't auto assign
                if (id) {
                  const selectedDispatcher = dispatchers.find(
                    (dispatcher) => dispatcher.id === id
                  );
                  if (selectedDispatcher) {
                    const filteredMarkers = loadedOrders.filter(order => order.dispatcherId === id)
                      .map((order) => {
                        return addMarkerwithColor(order, dispatchers);
                      })
                      .filter(
                        (marker): marker is MarkerData => marker !== null
                      );
                    setMarkers(filteredMarkers);
                  }
                } else {
                  // Show all orders when "All Dispatchers" is selected
                  const allMarkers = loadedOrders
                    .map((order) => {
                      return addMarkerwithColor(order, dispatchers);
                    })
                    .filter((marker): marker is MarkerData => marker !== null);
                  setMarkers(allMarkers);
                }
              }}
              options={dispatchersOption}
            />
            <Button
              type="primary"
              onClick={() => assignOrders()}
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
            orders={loadedOrders}
            dispatchers={dispatchers}
            setMarkers={setMarkers}
          />
        </Space>
      </Col>
    </Row>
  );
}

AssignDispatchers.needMap = true;
