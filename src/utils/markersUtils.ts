import type { MarkerData } from "../types/markers";
import type { Order } from "../types/order";

const redIcon = {
  url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  color: "red",
};

// const blueIcon = {
//   url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
//   color: "blue",
// };

// const greenIcon = {
//   url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
//   color: "green",
// };

// const orangeIcon = {
//   url: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png",
//   color: "orange",
// };

const setMarkersList = (orders: Order[]): MarkerData[] => {
  return orders.map((order) => ({
    id: order.id,
    position: { lat: order.lat, lng: order.lng },
    address: order.address,
    icon: redIcon,
    dispatcherId: order.dispatcherId,
  }));
};

export default setMarkersList;
