import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import profileReducer from "./slices/profileSlice";
import themeReducer from "./slices/themeSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    theme: themeReducer,
  },
});

export default store;
