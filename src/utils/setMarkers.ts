import type { MarkerData } from "../types/markers";
import type { Order } from "../types/order";

const redIcon = {
  url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  color: "red",
};

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
