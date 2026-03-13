import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext(undefined);

const defaultUser = {
  name: "Alex",
  email: "demo@example.com",
  subscription: "free",
};

function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    const stored = localStorage.getItem("tunequest-auth");
    if (!stored) return { token: null, user: null };
    const parsed = JSON.parse(stored);
    return {
      token: parsed.token || null,
      user: parsed.user || null,
      refresh: parsed.refresh || null,
      subscription: parsed.subscription || parsed.user?.subscription || "free",
    };
  });

  useEffect(() => {
    const existing = localStorage.getItem("tunequest-auth")
      ? JSON.parse(localStorage.getItem("tunequest-auth"))
      : {};
    const merged = {
      ...existing,
      ...state,
      token: state.token || existing.token || null,
      refresh: state.refresh || existing.refresh || null,
      subscription:
        state.subscription || state.user?.subscription || existing.subscription || "free",
    };
    localStorage.setItem("tunequest-auth", JSON.stringify(merged));
  }, [state]);

  const login = async (credentials) => {
    // Stubbed login. Replace with API call.
    const token = "demo-token";
    const user = { ...defaultUser, email: credentials.email };
    setState({ token, user });
    return { token, user };
  };

  const register = async (payload) => {
    const token = "demo-token";
    const user = {
      ...defaultUser,
      name: payload.name || "New Musician",
      email: payload.email,
    };
    setState({ token, user });
    return { token, user };
  };

  const logout = () => setState({ token: null, user: null });

  const upgrade = () => {
    setState((prev) => {
      if (!prev.user) return prev;
      return { ...prev, user: { ...prev.user, subscription: "premium" } };
    });
  };

  const value = useMemo(
    () => ({
      token: state.token,
      user: state.user,
      subscription: state.user?.subscription || "free",
      login,
      register,
      logout,
      upgrade,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export { AuthProvider, useAuth };
