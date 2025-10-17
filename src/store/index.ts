import { configureStore } from "@reduxjs/toolkit";
import orderStatusReducer from "./orderSlice";

const store = configureStore({
  reducer: {
    order: orderStatusReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
