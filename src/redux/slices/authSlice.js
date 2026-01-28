import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: localStorage.getItem("tunequest-auth")
    ? JSON.parse(localStorage.getItem("tunequest-auth")).token
    : null,
  user: localStorage.getItem("tunequest-auth")
    ? JSON.parse(localStorage.getItem("tunequest-auth")).user
    : null,
  subscription: localStorage.getItem("tunequest-auth")
    ? JSON.parse(localStorage.getItem("tunequest-auth")).subscription || "free"
    : "free",
  error: null,
  isLoading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.error = null;
    },
    setSubscription: (state, action) => {
      state.subscription = action.payload;
    },
    loginSuccess: (state, action) => {
      const { token, user, subscription } = action.payload;
      state.token = token;
      state.user = user;
      state.subscription = subscription || "free";
      state.error = null;
      state.isLoading = false;
      const authData = { token, user, subscription: subscription || "free" };
      localStorage.setItem("tunequest-auth", JSON.stringify(authData));
    },
    registerSuccess: (state, action) => {
      const { token, user, subscription } = action.payload;
      state.token = token;
      state.user = user;
      state.subscription = subscription || "free";
      state.error = null;
      state.isLoading = false;
      const authData = { token, user, subscription: subscription || "free" };
      localStorage.setItem("tunequest-auth", JSON.stringify(authData));
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.subscription = "free";
      state.error = null;
      localStorage.removeItem("tunequest-auth");
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const {
  setLoading,
  setToken,
  setUser,
  setSubscription,
  loginSuccess,
  registerSuccess,
  logout,
  setError,
} = authSlice.actions;

export default authSlice.reducer;
