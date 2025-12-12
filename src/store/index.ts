import { configureStore } from "@reduxjs/toolkit";
import orderReducer from "./orderSlice";
import dispatcherReducer from "./dispatcherSlice";
import configReducer from './configSlice';

const store = configureStore({
  reducer: {
    order: orderReducer,
    dispatcher: dispatcherReducer,
    config: configReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
