import { configureStore } from "@reduxjs/toolkit";
import orderReducer from "./orderSlice";
import dispatcherReducer from "./dispatcherSlice";

const store = configureStore({
  reducer: {
    order: orderReducer,
    dispatcher: dispatcherReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
