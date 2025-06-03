import { configureStore } from "@reduxjs/toolkit";
import dispatchersReducer from "./features/disparturers";
import ordersReducer from "./features/orders";

export const store = configureStore({
  reducer: {
    dispatchers: dispatchersReducer,
    orders: ordersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
