import type { Customer } from "./customer";
import type { Order } from "./order";

export type MarkerData = {
  position: { lat: number; lng: number };
  address: string;
  area: string;
  district: string;
  icon?: { url: string; scaledSize?: number; color: string };
  meters: Order[],
  dispatcherId?: number;
  customer?: Customer
};
