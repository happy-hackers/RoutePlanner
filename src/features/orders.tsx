import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface Order {
  id: number;
  date: string;
  time: "Morning" | "Afternoon" | "Evening";
  state: "Pending" | "Assigned" | "In Progress" | "Delivered" | "Cancelled"
  address: string;
  lat: number;
  lng: number;
  postcode: number;
  dispatcherId?: number;
}

const initialState: Order[] = [
  {
    id: 1,
    date: "Nov-29-2021",
    time: "Afternoon",
    state: "Assigned",
    address: "125 Flinders Ln, Melbourne VIC 3000",
    lat: -37.81564480562998,
    lng: 144.970422362876,
    postcode: 3000,
    dispatcherId: 1
  },
  {
    id: 4,
    date: "Nov-29-2021",
    time: "Afternoon",
    state: "Assigned",
    address: "2 Francis St, Melbourne VIC 3000",
    lat: -37.817744572448575,
    lng: 144.95673515302266,
    postcode: 3000,
    dispatcherId: 1
  },
  {
    id: 2,
    date: "Nov-29-2021",
    time: "Afternoon",
    state: "Assigned",
    address: "253 Esplanade, Brighton VIC 3186",
    lat: -37.908419258504026,
    lng: 144.98805500251115,
    postcode: 3186,
    dispatcherId: 2
  },
  {
    id: 3,
    date: "Nov-29-2021",
    time: "Afternoon",
    state: "Assigned",
    address: "412a Brunswick St, Fitzroy VIC 3065",
    lat: -37.79442968192104,
    lng: 144.980068111049,
    postcode: 3065,
    dispatcherId: 3
  }
]

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    addOrder: (state, action: PayloadAction<Order>) => {
      state.push(action.payload);
    },
  },
});

export const { addOrder } = ordersSlice.actions;

export default ordersSlice.reducer;
