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

const setMarkersList = (orders: Order[], dispatchers: Dispatcher[]): MarkerData[] => {
  const DISPATCHER_COLORS_MAP = generateDispatcherColorsMap(dispatchers);
  return orders.map((order) => ({
    id: order.id,
    position: { lat: order.lat, lng: order.lng },
    address: `${order.detailedAddress}, ${order.area}`,
    icon: order.dispatcherId? DISPATCHER_COLORS_MAP[order.dispatcherId] : greyIcon,
    dispatcherId: order.dispatcherId,
  }));
};

const addMarkerwithColor = (order: Order, dispatchers: Dispatcher[]): MarkerData => {
  const DISPATCHER_COLORS_MAP = generateDispatcherColorsMap(dispatchers);
  return {
    id: order.id,
    position: { lat: order.lat, lng: order.lng },
    address: `${order.detailedAddress}, ${order.area}`,
    icon: order.dispatcherId? DISPATCHER_COLORS_MAP[order.dispatcherId] : greyIcon,
    customer: order.customer,
    dispatcherId: order.dispatcherId,
  };
};

export { generateDispatcherColorsMap, addMarkerwithColor, setMarkersList };
