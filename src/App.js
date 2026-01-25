import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProfileProvider } from "./context/ProfileContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import PremiumRoute from "./components/PremiumRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import InstrumentPage from "./pages/InstrumentPage";
import SkillLevelPage from "./pages/SkillLevelPage";
import GoalPage from "./pages/GoalPage";
import DashboardPage from "./pages/DashboardPage";
import PracticePlanPage from "./pages/PracticePlanPage";
import ExercisesPage from "./pages/ExercisesPage";
import QuizPage from "./pages/QuizPage";
import ProgressPage from "./pages/ProgressPage";
import SubscriptionPage from "./pages/SubscriptionPage";

function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
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
      </ProfileProvider>
    </AuthProvider>
  );
}

export default App;
