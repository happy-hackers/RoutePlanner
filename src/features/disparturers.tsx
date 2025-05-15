import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface Dispatcher {
  name: string;
  id: number;
  Activeday: string[];
  responsibleArea: string[];
  assignedOrderIds: number[];
}

const initialState: Dispatcher[] = [
  {
    name: "Amy",
    id: 1,
    Activeday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    responsibleArea: ["A", "B", "C"],
    assignedOrderIds: [],
  },
  {
    name: "Bob",
    id: 2,
    Activeday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    responsibleArea: ["A", "B", "C"],
    assignedOrderIds: [],
  },
  {
    name: "Charles",
    id: 3,
    Activeday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    responsibleArea: ["A", "B", "C"],
    assignedOrderIds: [],
  },
  {
    name: "Matthew",
    id: 4,
    Activeday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    responsibleArea: ["A", "B", "C"],
    assignedOrderIds: [],
  },
  {
    name: "Lily",
    id: 5,
    Activeday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    responsibleArea: ["A", "B", "C"],
    assignedOrderIds: [],
  },
];

const dispatchersSlice = createSlice({
  name: "dispatchers",
  initialState,
  reducers: {
    toggleDay: (state, action: PayloadAction<{ id: number; day: string }>) => {
      const dispatcher = state.find((d) => d.id === action.payload.id);
      if (dispatcher) {
        const dayIndex = dispatcher.Activeday.indexOf(action.payload.day);
        if (dayIndex === -1) {
          dispatcher.Activeday.push(action.payload.day);
        } else {
          dispatcher.Activeday.splice(dayIndex, 1);
        }
      }
    },
    updateArea: (
      state,
      action: PayloadAction<{ id: number; areas: string[] }>
    ) => {
      const dispatcher = state.find((d) => d.id === action.payload.id);
      if (dispatcher) {
        dispatcher.responsibleArea = action.payload.areas;
      }
    },
  },
});

export const { toggleDay, updateArea } = dispatchersSlice.actions;

export default dispatchersSlice.reducer;
