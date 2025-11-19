import type { Customer } from "./customer";

export interface Order {
  id: number;
  date: string;
  time: "Morning" | "Afternoon" | "Evening";
  status: OrderStatus;
  detailedAddress: string;
  area: string;
  district: string;
  lat: number;
  lng: number;
  postcode?: number;
  dispatcherId?: number;
  customerId: number; // Foreign key
  customer?: Customer;
  note?: string;
}

export type OrderStatus =
  | "Pending"
  | "Assigned"
  | "In Progress"
  | "Delivered"
  | "Cancelled";
