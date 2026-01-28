import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Provider, useDispatch } from "react-redux";
import store from "./redux/store";
import { initializeTheme } from "./redux/slices/themeSlice";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import PremiumRoute from "./components/PremiumRoute";
import LandingPage from "./screens/LandingPage";
import LoginPage from "./screens/LoginPage";
import RegisterPage from "./screens/RegisterPage";
import ForgotPasswordPage from "./screens/ForgotPasswordPage";
import InstrumentPage from "./screens/InstrumentPage";
import SkillLevelPage from "./screens/SkillLevelPage";
import GoalPage from "./screens/GoalPage";
import DashboardPage from "./screens/DashboardPage";
import PracticePlanPage from "./screens/PracticePlanPage";
import ExercisesPage from "./screens/ExercisesPage";
import QuizPage from "./screens/QuizPage";
import ProgressPage from "./screens/ProgressPage";
import SubscriptionPage from "./screens/SubscriptionPage";

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot" element={<ForgotPasswordPage />} />
              <Route
                path="/onboarding/instrument"
                element={
                  <ProtectedRoute>
                    <InstrumentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding/skill"
                element={
                  <ProtectedRoute>
                    <SkillLevelPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding/goals"
                element={
                  <ProtectedRoute>
                    <GoalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plan"
                element={
                  <ProtectedRoute>
                    <PracticePlanPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exercises"
                element={
                  <ProtectedRoute>
                    <ExercisesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz"
                element={
                  <ProtectedRoute>
                    <QuizPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <PremiumRoute>
                    <ProgressPage />
                  </PremiumRoute>
                }
              />
              <Route path="/subscribe" element={<SubscriptionPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
