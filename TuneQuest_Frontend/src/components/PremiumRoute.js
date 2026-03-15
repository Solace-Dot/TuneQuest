import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

function PremiumRoute({ children }) {
  const { token, subscription } = useSelector((state) => state.auth);
  if (!token) return <Navigate to="/login" replace />;
  if (subscription !== "premium") return <Navigate to="/subscribe" replace />;
  return children;
}

export default PremiumRoute;

