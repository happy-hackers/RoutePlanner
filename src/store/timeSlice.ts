import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import dayjs, { Dayjs } from "dayjs";

export type TimePeriod = "Morning" | "Afternoon" | "Evening";

interface TimeState {
  date: Dayjs;
  timePeriod: TimePeriod;
}

const initialState: TimeState = {
  date: dayjs(),
  timePeriod: "Afternoon",
};

const timeSlice = createSlice({
  name: "time",
  initialState,
  reducers: {
    setDate(state, action: PayloadAction<Dayjs>) {
      state.date = action.payload;
    },
    setTimePeriod(state, action: PayloadAction<TimePeriod>) {
      state.timePeriod = action.payload;
    },
  },
});

export const { setDate, setTimePeriod } = timeSlice.actions;
export default timeSlice.reducer;
