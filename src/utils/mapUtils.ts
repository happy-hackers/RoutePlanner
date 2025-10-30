import type { DeliveryRoute } from '../types/delivery-route';
import type { Order } from '../types/order';

export const generateGoogleMapsUrl = (
  deliveryRoute: DeliveryRoute,
  orders: Order[]
): string => {
  if (!deliveryRoute || orders.length === 0) return '';

  const origin = encodeURIComponent(deliveryRoute.startAddress);
  const destination = encodeURIComponent(deliveryRoute.endAddress);

  // Waypoints are all the delivery addresses
  const waypoints = orders
    .map(order => encodeURIComponent(order.detailedAddress))
    .join('|');

  // Generate Google Maps directions URL
  // On mobile: opens native app
  // On desktop: opens maps.google.com
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
};

export const getNextIncompleteStopIndex = (
  orders: Order[],
  currentIndex: number
): number => {
  // Find next incomplete after current position
  let nextIndex = orders.findIndex(
    (o, i) => i > currentIndex && o.status !== 'Delivered'
  );

  // If none found, find first incomplete from start
  if (nextIndex === -1) {
    nextIndex = orders.findIndex(o => o.status !== 'Delivered');
  }

  return nextIndex;
};
