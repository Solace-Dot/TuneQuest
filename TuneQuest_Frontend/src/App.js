import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./redux/store";
import { initializeTheme } from "./redux/slices/themeSlice";
import { storePlan, setTokens } from "./redux/slices/aiPlanSlice";
import { ProfileProvider } from "./context/ProfileContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import PremiumRoute from "./components/PremiumRoute";
import BackgroundManager from "./backgrounds/BackgroundManager";
import api from "./api/client";
import { startTokenRefreshScheduler, stopTokenRefreshScheduler } from "./services/tokenRefresher";
import LandingPage from "./screens/LandingPage";
import LoginPage from "./screens/LoginPage";
import RegisterPage from "./screens/RegisterPage";
import ForgotPasswordPage from "./screens/ForgotPasswordPage";
import PracticePlanForm from "./screens/PracticePlanForm";
import DashboardPage from "./screens/DashboardPage";
import PracticePlanPage from "./screens/PracticePlanPage";
import ExercisesPage from "./screens/ExercisesPage";
import LearnPage from "./screens/LearnPage";
import QuizPage from "./screens/QuizPage";
import ProgressPage from "./screens/ProgressPage";
import SubscriptionPage from "./screens/SubscriptionPage";
import ProfilePage from "./screens/ProfilePage";
import SettingsPage from "./screens/SettingsPage";
import ChatWidget from './components/ChatWidget';
import MusicalGame from "./components/MusicEngine";
import SongPage from "./screens/SongPage";

// Disables the animated background on game routes to prevent lag
function BackgroundController({ userBgEffect }) {
  const location = useLocation();
  const isGameRoute = location.pathname === '/game' || location.pathname === '/game/song';
  return <BackgroundManager effect={isGameRoute ? 'none' : userBgEffect} />;
}

function AppContent() {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const currentPlan = useSelector((state) => state.aiPlan.plan);
  const [bgEffect, setBgEffect] = useState(() => localStorage.getItem('selectedBg') || 'none');

  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  // Listen for background changes dispatched from SettingsPage
  useEffect(() => {
    const handler = (e) => setBgEffect(e.detail || 'none');
    window.addEventListener('bgchange', handler);
    return () => window.removeEventListener('bgchange', handler);
  }, []);

  useEffect(() => {
    if (!token) {
      setBgEffect('none');
    }
  }, [token]);

  // Restore the latest saved practice plan from DB if Redux is empty
  useEffect(() => {
    if (!token || currentPlan) return;
    api.get('/api/exercises/plans/today/')
      .then((res) => {
        const data = res.data;
        // Only process if there's actually a plan
        if (data.plan_json && Object.keys(data.plan_json).length > 0) {
          dispatch(storePlan({
            plan: data.plan_json,
            exerciseIds: data.exercise_ids || [],
            skillLevel: data.skill_level || 'Beginner',
            instrument: data.instrument || 'Guitar',
            recommendedLessonSlugs: data.recommended_lesson_slugs || [],
            dailyPlanId: data.id,
          }));
        }
        // If no plan exists, response will have plan_json: null - silently ignore
      })
      .catch(() => {
        // Silently ignore any other errors
      });
  }, [token, currentPlan, dispatch]);

  // Fetch real token count on startup so the dashboard shows the live value
  useEffect(() => {
    if (!token) return;
    api.get('/api/ai/tokens/')
      .then((res) => dispatch(setTokens({
        tokensRemaining: res.data.tokens_remaining,
        tokensLimit: res.data.tokens_limit
      })))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Start/stop token refresh scheduler based on authentication state
  useEffect(() => {
    if (token) {
      // User is logged in, start the token refresh scheduler
      startTokenRefreshScheduler();
    } else {
      // User is logged out, stop the scheduler
      stopTokenRefreshScheduler();
    }

    // Cleanup on unmount
    return () => {
      if (!token) {
        stopTokenRefreshScheduler();
      }
    };
  }, [token]);

  return (
    <BrowserRouter>
      <BackgroundController userBgEffect={bgEffect} />
      <Layout>
        <Routes>
            <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot" element={<ForgotPasswordPage />} />
              <Route path="/game" element={<MusicalGame />} />
              <Route path="/game/song" element={<SongPage />} />
              <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/plan/form"
                element={
                  <ProtectedRoute>
                    <PracticePlanForm />
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
                path="/learn"
                element={
                  <ProtectedRoute>
                    <LearnPage />
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
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
          {token && <ChatWidget />}
        </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ProfileProvider>
        <AppContent />
      </ProfileProvider>
    </Provider>
  );
}

export default App;
