import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface Order {
  id: number;
  date: string;
  time: string;
  address: string;
  postcode: string;
  dispatcherId: number;
}

const initialState: Order[] = [];

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    addOrder: (state, action: PayloadAction<Omit<Order, "id">>) => {
      const newOrder: Order = {
        ...action.payload,
        id: state.length + 1,
      };
      state.push(newOrder);
    },
  },
});

export const { addOrder } = ordersSlice.actions;

export default ordersSlice.reducer;
