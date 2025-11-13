import type { MarkerData } from "../types/markers";
import type { Order } from "../types/order";
import redIconImage from "../assets/icons/marker-icon-2x-red.png"
import blueIconImage from "../assets/icons/marker-icon-2x-blue.png"
import orangeIconImage from "../assets/icons/marker-icon-2x-orange.png"
import greyIconImage from "../assets/icons/marker-icon-2x-grey.png"
import blackIconImage from "../assets/icons/marker-icon-2x-black.png"
import goldIconImage from "../assets/icons/marker-icon-2x-gold.png"
import violetIconImage from "../assets/icons/marker-icon-2x-violet.png"
import greenIconImage from "../assets/icons/marker-icon-2x-green.png"
import type { Dispatcher } from "../types/dispatchers";

const generateDispatcherColorsMap = (dispatchers: Dispatcher[]) => {
  const map: Record<number, { url: string; color: string }> = {};
  
  dispatchers.forEach((dispatcher, index) => {
    map[dispatcher.id] = ICONS[index];
  });

  return map;
};

const greyIcon = {
  url: greyIconImage,
  color: "grey",
}

const redIcon = {
  url: redIconImage,
  color: "red",
};

const blueIcon = {
  url: blueIconImage,
  color: "blue",
};

const orangeIcon = {
  url: orangeIconImage,
  color: "orange",
};

const blackIcon = {
  url: blackIconImage,
  color: "black",
};

const goldIcon = {
  url: goldIconImage,
  color: "gold",
};

const violetIcon = {
  url: violetIconImage,
  color: "violet",
};

const greenIcon = {
  url: greenIconImage,
  color: "green",
};

const ICONS = [redIcon, blueIcon, orangeIcon, blackIcon, goldIcon, violetIcon, greenIcon];

/**
 * 
 * @param orders Orders that have the same lat, lng and dispatcherId (regard null and undefined as the same)
 * @param dispatchers 
 * @returns A marker that has orders with same lat, lng and dispatcherId
 */
const getMarkerWithMultiMeters = (orders: Order[], dispatchers: Dispatcher[]): MarkerData => {
  const DISPATCHER_COLORS_MAP = generateDispatcherColorsMap(dispatchers);
  const orderSample = orders[0];
  return {
    position: { lat: orderSample.lat, lng: orderSample.lng },
    address: orderSample.detailedAddress,
    area: orderSample.area,
    district: orderSample.district,
    meters: orders,
    icon: orderSample.dispatcherId? DISPATCHER_COLORS_MAP[orderSample.dispatcherId] : greyIcon,
    customer: orderSample.customer,
    dispatcherId: orderSample.dispatcherId,
  };
};

/**
 * 
 * @param orders Orders that may contain different lat, lng and dispatcherId
 * @param dispatchers 
 * @returns Markers that have orders with same lat, lng and dispatcherId
 */

const getGroupedMarkers = (orders: Order[], dispatchers: Dispatcher[]): MarkerData[] => {
  const normalizeDispatcherId = (id: number | null | undefined) =>
    id == null ? "null" : id.toString(); // null and undefined are treated as the same group "null"

  // Group orders by lat, lng and dispatcherId
  const grouped = orders.reduce((acc, order) => {
    // Treat null and undefined as equal
    const key = `${order.lat},${order.lng},${normalizeDispatcherId(order.dispatcherId)}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  // Convert grouped orders into markers
  const markers = Object.values(grouped).map((orders) =>
    getMarkerWithMultiMeters(orders, dispatchers)
  );
  return markers;
};



const addMarkerwithColor = (order: Order, dispatchers: Dispatcher[]): MarkerData => {
  const DISPATCHER_COLORS_MAP = generateDispatcherColorsMap(dispatchers);
  return {
    position: { lat: order.lat, lng: order.lng },
    address: order.detailedAddress,
    area: order.area,
    district: order.district,
    meters: [order],
    icon: order.dispatcherId? DISPATCHER_COLORS_MAP[order.dispatcherId] : greyIcon,
    customer: order.customer,
    dispatcherId: order.dispatcherId,
  };
};

export { generateDispatcherColorsMap, addMarkerwithColor, getMarkerWithMultiMeters, getGroupedMarkers };
