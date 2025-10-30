import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Dispatcher } from "../types/dispatchers.ts";

interface DispatcherState {
  dispatchers: Dispatcher[];
}

const initialState: DispatcherState = {
  dispatchers: [],
};

const dispatcherSlice = createSlice({
  name: "dispatcher",
  initialState,
  reducers: {
    setDispatchers(state, action: PayloadAction<Dispatcher[]>) {
      state.dispatchers = action.payload;
    }
  },
});

export const { setDispatchers } = dispatcherSlice.actions;
export default dispatcherSlice.reducer;
