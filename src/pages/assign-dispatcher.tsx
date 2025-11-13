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
import { setSelectedOrders } from "../store/orderSlice";
import type { Customer } from "../types/customer";
import { useTranslation } from "react-i18next";

export default function AssignDispatchers({
  setMarkers,
  hoveredOrderId: _hoveredOrderId,
  setHoveredOrderId,
}: {
  setMarkers: (markers: MarkerData[]) => void;
  hoveredOrderId: number | null;
  setHoveredOrderId: (id: number | null) => void;
}) {
  const { t } = useTranslation("assignDispatcher");
  const { message } = App.useApp();
  const dispatch = useDispatch();
  const selectedOrders = useSelector((state: RootState) => state.order.selectedOrders);
  const isEveryOrderAssigned = selectedOrders.every(order => order.dispatcherId !== null && order.dispatcherId !== undefined);
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
        console.error(t("message_error_fetch"), error);
        message.error(t("message_error_load"));
      }
    };

    fetchDispatchers();
  }, []);

  const dispatchersOption = [
    { value: null, label: t("select_all_dispatchers") },
    ...dispatchers.map((dispatcher) => ({
      value: dispatcher.id,
      label: dispatcher.name,
    })),
  ];

  const handleUpdateOrders = async (
    order: Order | (Order & { matchedDispatchers: Dispatcher[] }), dispatcher: Dispatcher, newActiveOrders: Order[]
  ): Promise<Order[]> => {
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
      message.success(t("message_success", {
        orderId: order.id,
        dispatcherName: dispatcher.name
      }));
    } else {
      message.error(t("message_error_update", {
        orderId: order.id,
        error: result.error
      }));
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
        message.warning(t("message_warning_not_found", {
          orderId: order.id
        }));
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
          message.warning(t("message_warning_not_found", {
            orderId: order.id
          }));
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
          message.warning(t("message_warning_not_found", {
            orderId: order.id
          }));
        }
      }
    }
    dispatch(setSelectedOrders(newActiveOrders));
    setIsAssigning(false);

  };
  const confirm = () => {
    const newActiveOrders = selectedOrders.map(order => ({
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
                    const filteredMarkers = selectedOrders.filter(order => order.dispatcherId === id)
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
                  const allMarkers = selectedOrders
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
                title={t("popconfirm_title")}
                okText={t("popconfirm_ok")}
                cancelText={t("popconfirm_cancel")}
                onConfirm={confirm}
              >
                <Button type="primary" loading={isAssigning} disabled={selectedId !== null}>
                  {isAssigning ? t("button_assigning") : t("button_auto_assign")}
                </Button>
              </Popconfirm>
            ) : (
              <Button
                type="primary"
                loading={isAssigning}
                disabled={selectedId !== null}
                onClick={() => assignOrders(selectedOrders)}
              >
                {isAssigning ? t("button_assigning") : t("button_auto_assign")}
              </Button>
            )}
          </Space>
          <Dispatcherform
            selectedDispatcher={
              selectedId
                ? dispatchers.find((d) => d.id === selectedId) || null
                : null
            }
            orders={selectedOrders}
            dispatchers={dispatchers}
            setMarkers={setMarkers}
            setHoveredOrderId={setHoveredOrderId}
          />
        </Space>
      </Col>
    </Row>
  );
}

AssignDispatchers.needMap = true;
