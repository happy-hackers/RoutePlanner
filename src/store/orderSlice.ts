import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import dayjs, { Dayjs } from "dayjs";
import type { OrderStatus } from "../types/order.ts";

export type TimePeriod = "Morning" | "Afternoon" | "Evening";

interface OrderState {
  status: OrderStatus[];
  date: Dayjs;
  timePeriod: TimePeriod[];
}

const initialState: OrderState = {
  status: ["In Progress"],
  date: dayjs(),
  timePeriod: ["Afternoon"],
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
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

export const { setStatus, setDate, setTimePeriod } = orderSlice.actions;
export default orderSlice.reducer;
