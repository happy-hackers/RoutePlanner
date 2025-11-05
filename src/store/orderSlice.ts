import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import dayjs, { Dayjs } from "dayjs";
import type { Order, OrderStatus } from "../types/order.ts";

export type TimePeriod = "Morning" | "Afternoon" | "Evening";

interface OrderState {
  selectedOrders: Order[];
  status: OrderStatus[];
  date: Dayjs;
  timePeriod: TimePeriod[];
}

const initialState: OrderState = {
  selectedOrders: [],
  status: ["Pending"],
  date: dayjs(),
  timePeriod: [],
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    setSelectedOrders(state, action: PayloadAction<Order[]>) {
      state.selectedOrders = action.payload;
    },
    setStatus(state, action: PayloadAction<OrderStatus[]>) {
      state.status = action.payload;
    },
    setDate(state, action: PayloadAction<Dayjs>) {
      state.date = action.payload;
    },
    setTimePeriod(state, action: PayloadAction<TimePeriod[]>) {
      state.timePeriod = action.payload;
    },
  },
});

export const { setSelectedOrders, setStatus, setDate, setTimePeriod } = orderSlice.actions;
export default orderSlice.reducer;
