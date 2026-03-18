import { createSlice } from "@reduxjs/toolkit";

let storedAuth = null;
try {
  const raw = localStorage.getItem("tunequest-auth");
  storedAuth = raw ? JSON.parse(raw) : null;
} catch (_err) {
  storedAuth = null;
}

const initialState = {
  token: storedAuth?.token || null,
  user: storedAuth?.user || null,
  subscription: storedAuth?.subscription || "free",
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
      if (state.token && state.user) {
        const authData = {
          token: state.token,
          user: state.user,
          subscription: action.payload,
        };
        localStorage.setItem("tunequest-auth", JSON.stringify(authData));
      }
    },
    loginSuccess: (state, action) => {
      const { token, user, subscription, refresh } = action.payload;
      state.token = token;
      state.user = user;
      state.subscription = subscription || "free";
      state.error = null;
      state.isLoading = false;
      const existingAuth = localStorage.getItem("tunequest-auth")
        ? JSON.parse(localStorage.getItem("tunequest-auth"))
        : {};
      const authData = {
        token,
        user,
        subscription: subscription || "free",
        refresh: refresh || existingAuth.refresh || null,
      };
      localStorage.setItem("tunequest-auth", JSON.stringify(authData));
    },
    registerSuccess: (state, action) => {
      const { token, user, subscription, refresh } = action.payload;
      state.token = token;
      state.user = user;
      state.subscription = subscription || "free";
      state.error = null;
      state.isLoading = false;
      const existingAuth = localStorage.getItem("tunequest-auth")
        ? JSON.parse(localStorage.getItem("tunequest-auth"))
        : {};
      const authData = {
        token,
        user,
        subscription: subscription || "free",
        refresh: refresh || existingAuth.refresh || null,
      };
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
