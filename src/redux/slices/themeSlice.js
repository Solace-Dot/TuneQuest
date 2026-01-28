import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  mode: localStorage.getItem("tunequest-theme")
    ? localStorage.getItem("tunequest-theme")
    : window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.mode = action.payload;
      document.documentElement.setAttribute("data-theme", action.payload);
      localStorage.setItem("tunequest-theme", action.payload);
    },
    toggleTheme: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", state.mode);
      localStorage.setItem("tunequest-theme", state.mode);
    },
    initializeTheme: (state) => {
      document.documentElement.setAttribute("data-theme", state.mode);
    },
  },
});

export const { setTheme, toggleTheme, initializeTheme } = themeSlice.actions;

export default themeSlice.reducer;
