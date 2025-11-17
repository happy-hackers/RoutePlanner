import type { DeliveryRoute } from "../types/delivery-route";
import type { Order } from "../types/order";

export const generateGoogleMapsUrl = (deliveryRoute: DeliveryRoute): string => {
  if (!deliveryRoute || deliveryRoute.addressMeterSequence.length === 0)
    return "";

  const origin = encodeURIComponent(deliveryRoute.startAddress);
  const destination = encodeURIComponent(deliveryRoute.endAddress);

  // Waypoints: use stop addresses with Hong Kong context
  const waypoints = deliveryRoute.addressMeterSequence
    .map((stop) => {
      const address = stop.address;
      const addressWithContext = address.toLowerCase().includes("hong kong")
        ? address
        : `${address}, Hong Kong`;
      return encodeURIComponent(addressWithContext);
    })
    .join("|");

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
    (stop, i) =>
      i > currentIndex &&
      stop.meters.some((order) => order.status !== "Delivered")
  );

  // If none found, find first incomplete stop from start
  if (nextIndex === -1) {
    nextIndex = stops.findIndex((stop) =>
      stop.meters.some((order) => order.status !== "Delivered")
    );
  }

  return nextIndex;
};

/**
 * This uses the ‘haversine’ formula to calculate the great-circle distance between two points
 * – that is, the shortest distance over the earth’s surface
 * @param lat1 Point 1's lat
 * @param lng1 Point 1's lng
 * @param lat2 Point 2's lat
 * @param lng2 Point 2's lng
 * @returns The shortest distance between two points
 */
export const getDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
