import { configureStore } from "@reduxjs/toolkit";
import dispatchersReducer from "./features/disparturers";

export const store = configureStore({
  reducer: {
    dispatchers: dispatchersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
