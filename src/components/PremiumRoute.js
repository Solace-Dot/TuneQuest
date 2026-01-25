import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PremiumRoute({ children }) {
  const { token, subscription } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (subscription !== "premium") return <Navigate to="/subscribe" replace />;
  return children;
}

export default PremiumRoute;
