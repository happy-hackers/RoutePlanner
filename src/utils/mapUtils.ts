import type { DeliveryRoute } from '../types/delivery-route';
import type { Order } from '../types/order';

export const generateGoogleMapsUrl = (
  deliveryRoute: DeliveryRoute,
): string => {
  if (!deliveryRoute || deliveryRoute.addressMeterSequence.length === 0) return '';

  const origin = encodeURIComponent(deliveryRoute.startAddress);
  const destination = encodeURIComponent(deliveryRoute.endAddress);

  // Waypoints: use stop addresses with Hong Kong context
  const waypoints = deliveryRoute.addressMeterSequence
    .map(stop => {
      const address = stop.address;
      const addressWithContext = address.toLowerCase().includes('hong kong')
        ? address
        : `${address}, Hong Kong`;
      return encodeURIComponent(addressWithContext);
    })
    .join('|');

  // Generate Google Maps directions URL
  // On mobile: opens native app
  // On desktop: opens maps.google.com
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
};

export const getNextIncompleteStopIndex = (
  stops: { meters: Order[] }[],
  currentIndex: number
): number => {
  // Find next incomplete stop after current position
  let nextIndex = stops.findIndex(
    (stop, i) => i > currentIndex && stop.meters.some(order => order.status !== 'Delivered')
  );

  // If none found, find first incomplete stop from start
  if (nextIndex === -1) {
    nextIndex = stops.findIndex(
      stop => stop.meters.some(order => order.status !== 'Delivered')
    );
  }

  return nextIndex;
};
