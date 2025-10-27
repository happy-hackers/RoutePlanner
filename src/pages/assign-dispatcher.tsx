import { Select, Button, Row, Col, Space, App, Popconfirm } from "antd";
import { useState, useEffect } from "react";
import Dispatcherform from "../components/Dispatcherform";
import type { Dispatcher } from "../types/dispatchers";
import {
  getAllDispatchers,
  updateOrder,
} from "../utils/dbUtils";
import type { MarkerData } from "../types/markers";
import type { Order } from "../types/order";
import { addMarkerwithColor, setMarkersList } from "../utils/markersUtils";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { setLoadedOrders } from "../store/orderSlice";
import type { Customer } from "../types/customer";

export default function AssignDispatchers({
  setMarkers,
}: {
  setMarkers: (markers: MarkerData[]) => void;
}) {
  const { message } = App.useApp();
  const dispatch = useDispatch();
  const loadedOrders = useSelector((state: RootState) => state.order.loadedOrders);
  const isEveryOrderAssigned = loadedOrders.every(order => order.dispatcherId !== null && order.dispatcherId !== undefined);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

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

  const handleUpdateOrders = async (
    order: Order | (Order & { matchedDispatchers: Dispatcher[] }), dispatcher: Dispatcher, newActiveOrders: Order[]
  ) : Promise<Order[]> => {
    let customer: Customer | undefined;
    let rest: Omit<Order, "customer">;
    let matchedDispatchers: Dispatcher[] = [];
    if ("matchedDispatchers" in order) {
      ({ customer, matchedDispatchers, ...rest } = order);
    } else {
      ({ customer, ...rest } = order);
    }
    void matchedDispatchers;
    const updatedOrder: Order = {
      ...rest,
      dispatcherId: dispatcher.id,
      status: "In Progress",
    };
    const result = await updateOrder(updatedOrder);

    if (result.success) {
      newActiveOrders = newActiveOrders.map((order) =>
        order.id === updatedOrder.id ? { ...updatedOrder, customer: customer ?? undefined } : order
      );
      const newMarkers = setMarkersList(newActiveOrders, dispatchers);
      setMarkers(newMarkers);
      message.success(`Order ${order.id} assigned to ${dispatcher.name}`);
    } else {
      message.error(`Failed to update order ${order.id}: ${result.error}`);
    }
    return newActiveOrders
  };

  const getDispatcherWithLeastAssigned = (
    dispatchers: Dispatcher[],
    tempOrders: Order[]
  ): Dispatcher | null => {
    let minDispatcher: Dispatcher | null = null;
    let minCount = Infinity;

    for (const dispatcher of dispatchers) {
      const assignedCount = tempOrders.filter(
        (order) => order.dispatcherId === dispatcher.id
      ).length;

      if (assignedCount < minCount) {
        minCount = assignedCount;
        minDispatcher = dispatcher;
      }
    }

    return minDispatcher;
  };

  const assignOrders = async (newActiveOrders: Order[]) => {
    setIsAssigning(true);
    if (dispatchers.length === 0) return;
    // 1. First assign those orders whose area or district only matches to one dispatcher
    // 2. Then assign those orders whose area or district matches more than one dispatcher
    // 3. Lastly assign those orders whose area or district doesn't match any dispatcher
    let unassignedOrderswithDispatchers: (Order & { matchedDispatchers: Dispatcher[] })[] = [];
    let unassignedOrderswithNoDispatchers: Order[] = [];
    for (const order of newActiveOrders) {
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
      // If there is no district matched, try to find a area
      if (matchedDispatchers.length === 0) {
        matchedDispatchers = dispatchers.filter((d) =>
          d.responsibleArea.some(
            ([area]) => area.toLowerCase() === customer.area.toLowerCase()
          )
        );
        // If there is only one dispatcher matched, assign the order to the person
        if (matchedDispatchers.length === 0) {
          unassignedOrderswithNoDispatchers.push(order);
          continue;
        } else if (matchedDispatchers.length === 1) {
          
          matchedDispatcher = matchedDispatchers[0];
        } else if (matchedDispatchers.length > 1) {
          unassignedOrderswithDispatchers.push({
            ...order,
            matchedDispatchers,
          });
          continue;
        }
      } else if (matchedDispatchers.length === 1) {
        matchedDispatcher = matchedDispatchers[0];
      } else if (matchedDispatchers.length > 1) {
        unassignedOrderswithDispatchers.push({ ...order, matchedDispatchers });
        console.log("unassignedOrderswithDispatchers", unassignedOrderswithDispatchers)
        continue;
      }
      if (matchedDispatcher) {
        newActiveOrders = await handleUpdateOrders(order, matchedDispatcher, newActiveOrders);
      } else {
        message.warning(`No dispatcher found for order ${order.id}`);
      }
}
      if (unassignedOrderswithDispatchers.length > 0) {
        for (const order of unassignedOrderswithDispatchers) {
          const dispatcher = getDispatcherWithLeastAssigned(
            order.matchedDispatchers,
            newActiveOrders
          );
          if (dispatcher) {
            newActiveOrders = await handleUpdateOrders(order, dispatcher, newActiveOrders);
          } else {
            message.warning(`No dispatcher found for order ${order.id}`);
          }
        }
      }
      if (unassignedOrderswithNoDispatchers.length > 0) {
        for (const order of unassignedOrderswithNoDispatchers) {
          const dispatcher = getDispatcherWithLeastAssigned(
            dispatchers,
            newActiveOrders
          );
          if (dispatcher) {
            newActiveOrders = await handleUpdateOrders(order, dispatcher, newActiveOrders);
          } else {
            message.warning(`No dispatcher found for order ${order.id}`);
          }
        }
      }
      dispatch(setLoadedOrders(newActiveOrders));
      setIsAssigning(false);

  };
    const confirm = () => {
      const newActiveOrders = loadedOrders.map(order => ({
        ...order,
        dispatcherId: undefined,
      }));
      assignOrders(newActiveOrders);
      console.log("newActiveOrders", newActiveOrders)
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
            {isEveryOrderAssigned ? (
              <Popconfirm
                placement="rightBottom"
                title={"Do you want to re-assign orders?"}
                okText="Yes"
                cancelText="No"
                onConfirm={confirm}
              >
                <Button type="primary" loading={isAssigning} disabled={selectedId !== null}>
                  {isAssigning ? "Assigning..." : "Auto Assign"}
                </Button>
              </Popconfirm>
            ) : (
              <Button
                type="primary"
                loading={isAssigning}
                disabled={selectedId !== null}
                onClick={() => assignOrders(loadedOrders)}
              >
                {isAssigning ? "Assigning..." : "Auto Assign"}
              </Button>
            )}
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
