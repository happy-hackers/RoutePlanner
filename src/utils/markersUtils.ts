import type { MarkerData } from "../types/markers";
import type { Order } from "../types/order";
import redIconImage from "../assets/icons/marker-icon-2x-red.png"
import blueIconImage from "../assets/icons/marker-icon-2x-blue.png"
import orangeIconImage from "../assets/icons/marker-icon-2x-orange.png"



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

// Color mapping for different regions
const REGION_COLORS: Record<string, { url: string; scaledSize?: number; color: string }> = {
  "Hong Kong Island": redIcon,
  "Kowloon": blueIcon,
  "New Territories": orangeIcon
};

const setMarkersList = (orders: Order[]): MarkerData[] => {
  return orders.map((order) => ({
    id: order.id,
    position: { lat: order.lat, lng: order.lng },
    address: `${order.detailedAddress}, ${order.area}`,
    icon: REGION_COLORS[order.area],
    dispatcherId: order.dispatcherId,
  }));
};

const addMarkerwithColor = (order: Order): MarkerData => {
  return {
    id: order.id,
    position: { lat: order.lat, lng: order.lng },
    address: `${order.detailedAddress}, ${order.area}`,
    icon: REGION_COLORS[order.area],
    customer: order.customer,
    dispatcherId: order.dispatcherId,
  };
};

export { addMarkerwithColor, setMarkersList };
