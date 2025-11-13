import type { Customer } from "./customer";

export type MarkerData = {
  id: number;
  position: { lat: number; lng: number };
  address: string;
  icon?: { url: string; scaledSize?: number; color: string };
  dispatcherId?: number;
  customer?: Customer
};
