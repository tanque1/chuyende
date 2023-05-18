import { createSlice } from "@reduxjs/toolkit";

export default  createSlice({
  name: "connection",
  initialState: {
    socket: null,
  },
  reducers: {
    setInitSocket: (state, { payload }) => {
      state.socket = payload;
    },
  },
});
