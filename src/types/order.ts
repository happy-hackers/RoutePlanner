import type { Customer } from "./customer";

export interface Order {
  id: number;
  date: string;
  time: "Morning" | "Afternoon" | "Evening";
  state: "Pending" | "Assigned" | "In Progress" | "Delivered" | "Cancelled";
  address: string;
  lat: number;
  lng: number;
  postcode: number;
  dispatcherId?: number;
  customerId: number; // Foreign key
  customer?: Customer;
}
