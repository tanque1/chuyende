import { createSlice } from "@reduxjs/toolkit";

export default  createSlice({
  name: "user",
  initialState: {
    info: JSON.parse(localStorage.getItem("user")) || null,
  },
  reducers: {
    userLogin: (state, { payload }) => {
      state.info = payload;
      localStorage.setItem("user", JSON.stringify(state.info));
    },
    userLogout: (state) => {
      state.info = null;
      localStorage.removeItem("user")
    }
  },
});
