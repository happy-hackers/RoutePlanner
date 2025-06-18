import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface Dispatcher {
  id: number;
  name: string;
  activeDay: string[];
  responsibleArea: string[];
}

/*const initialState: Dispatcher[] = [
  {
    name: "Amy",
    id: 1,
    activeDay: ["Mon"],
    responsibleArea: ["A", "B", "C"],
  },
  {
    name: "Bob",
    id: 2,
    activeDay: ["Tue"],
    responsibleArea: ["A", "B", "C"],
  },
  {
    name: "Charles",
    id: 3,
    activeDay: ["Wed"],
    responsibleArea: ["A", "B", "C"],
  },
  {
    name: "Matthew",
    id: 4,
    activeDay: ["Thu"],
    responsibleArea: ["A", "B", "C"],
  },
  {
    name: "Lily",
    id: 5,
    activeDay: ["Fri"],
    responsibleArea: ["A", "B", "C"],
  },
];*/

const initialState: Dispatcher[] = [];

const dispatchersSlice = createSlice({
  name: "dispatchers",
  initialState,
  reducers: {
    toggleDay: (state, action: PayloadAction<{ id: number; day: string }>) => {
      const dispatcher = state.find((d) => d.id === action.payload.id);
      if (dispatcher) {
        const dayIndex = dispatcher.activeDay.indexOf(action.payload.day);
        if (dayIndex === -1) {
          dispatcher.activeDay.push(action.payload.day);
        } else {
          dispatcher.activeDay.splice(dayIndex, 1);
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
    resetDispatchers: (
      _state,
      action: PayloadAction<Dispatcher[]>
    ) => {
      return action.payload;
    },
  },
});

export const { toggleDay, updateArea, resetDispatchers } = dispatchersSlice.actions;

export default dispatchersSlice.reducer;
