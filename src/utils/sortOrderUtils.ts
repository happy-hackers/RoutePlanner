import type { Order } from "../types/order";

// create a map of dispatcher id to name
/*const dispatcherMap = new Map(
    dispatchers.map((dispatcher) => [dispatcher.id, dispatcher.name])
);*/

const sortOrders = (orders: Order[]) => {
    const sortedOrders = [...orders].sort((a, b) => {
    // order by name
    /*const dispatcherA = a.dispatcherId
      ? dispatcherMap.get(a.dispatcherId) ?? "ZZZ"
      : "ZZZ"; // not assigned orders at the end
    const dispatcherB = b.dispatcherId
      ? dispatcherMap.get(b.dispatcherId) ?? "ZZZ"
      : "ZZZ";

    if (dispatcherA !== dispatcherB) {
      return dispatcherA.localeCompare(dispatcherB);
    }*/

    // if dispatcher is the same, order by id
    return a.id - b.id;
  })
  return sortedOrders;
}

export default sortOrders;