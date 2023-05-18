import { configureStore } from "@reduxjs/toolkit";
import connectionSlice from "./connectionSlice";
import userSlice from "./userSlice";


export const store = configureStore({
  reducer: {
    connection: connectionSlice.reducer,
    user: userSlice.reducer
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
