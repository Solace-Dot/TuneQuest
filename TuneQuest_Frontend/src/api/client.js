import axios from "axios";
import store from "../redux/store";
import { logout } from "../redux/slices/authSlice";
import { clearPlan } from "../redux/slices/aiPlanSlice";
import { clearProfile } from "../redux/slices/profileSlice";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
  headers: { 'Content-Type': 'application/json' }
});

let refreshPromise = null;

// Simple auth interceptor
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("tunequest-auth");
  if (stored) {
    const { token } = JSON.parse(stored);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isRefreshCall = originalRequest?.url?.includes("/api/auth/token/refresh/");

    if (status !== 401 || !originalRequest || originalRequest._retry || isRefreshCall) {
      return Promise.reject(error);
    }

    const stored = localStorage.getItem("tunequest-auth");
    if (!stored) return Promise.reject(error);

    const auth = JSON.parse(stored);
    if (!auth.refresh) return Promise.reject(error);

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${api.defaults.baseURL}/api/auth/token/refresh/`, {
            refresh: auth.refresh,
          })
          .then((res) => {
            const newAccess = res.data?.access;
            if (!newAccess) {
              throw new Error("Token refresh failed");
            }
            const updated = { ...auth, token: newAccess };
            localStorage.setItem("tunequest-auth", JSON.stringify(updated));
            return newAccess;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — force logout and redirect to login
      localStorage.removeItem("tunequest-profile");
      sessionStorage.clear();
      store.dispatch(clearPlan());
      store.dispatch(clearProfile());
      store.dispatch(logout());
      window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  }
);

// Single-request AI function calling
export const requestQuizGeneration = async (userMessage) => {
  try {
    const res = await api.post('/api/ai/quiz/generate/', { userMessage });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Quiz generation failed');
  }
};

// Generate quiz with detected function call
export const generateQuizFromFunctionCall = async (functionCall) => {
  try {
    const res = await api.post('/api/ai/quiz/create/', functionCall);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to create quiz');
  }
};

// Fetch all AI quizzes saved for the current user
export const fetchAIQuizzes = async () => {
  try {
    const res = await api.get('/api/ai/quiz/list/');
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch quizzes');
  }
};

export const completePracticeSession = async (payload) => {
  try {
    const res = await api.post('/api/ai/complete-practice-session/', payload);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to save practice session');
  }
};

// Delete an AI-generated quiz from the database
export const deleteAIQuiz = async (quizId) => {
  try {
    const res = await api.delete(`/api/ai/quiz/${quizId}/delete/`);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete quiz');
  }
};

// Get existing quiz for a practice step (or null if none exists)
export const getQuizForStep = async (stepId) => {
  try {
    const res = await api.get(`/api/ai/quiz/for-step/${stepId}/`);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch quiz');
  }
};

// Save/update the daily plan with the latest exercises and metadata
export const saveDailyPlan = async (planId, planJson, skillLevel, instrument) => {
  try {
    // Extract exercise IDs from the steps in planJson
    const exerciseIds = (planJson.steps || []).map((step) => step.id);
    
    const res = await api.patch(`/api/exercises/plans/${planId}/`, {
      plan_json: planJson,
      exercise_ids: exerciseIds, // Include the exercise IDs so they're persisted!
      skill_level: skillLevel,
      instrument: instrument,
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to save daily plan');
  }
};

// Mock functions for other pages (keep existing functionality working)
export const fetchProgress = async () => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return {
    streak: 6,
    completed: 6,
    remaining: 9,
    minutes: 75,
    latestScore: 88,
    focus: "Rhythmic Precision",
  };
};

export const fetchPracticePlan = async () => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return {
    title: "Intermediate Guitar Mastery: Week 3",
    subtitle: "AI-Generated Practice Plan",
    focus: "Rhythmic precision and dominant 7th vocabulary",
    steps: [
      {
        id: "chromatic-scales",
        title: "Warm-up: Chromatic Scales",
        detail: "Evenness across all four fingers with a metronome.",
        label: "Technique",
        status: "In Progress",
        duration: 10,
      },
      {
        id: "voicings",
        title: "Chord Voicings: Dominant 7ths",
        detail: "Transitions between common dominant 7th shapes.",
        label: "Harmony",
        status: "Not Started",
        duration: 15,
      },
      {
        id: "sight-reading",
        title: "Sight Reading: Grade 2 Melody",
        detail: "Accurate rhythm and steady tempo.",
        label: "Reading",
        status: "Not Started",
        duration: 20,
      },
      {
        id: "performance",
        title: "Performance Piece Rehearsal (A minor)",
        detail: "Dynamic control for the C section.",
        label: "Performance",
        status: "Completed",
        duration: 30,
        bestScore: 92,
      },
    ],
  };
};

export const generateDetailedProgressSummary = async () => {
  try {
    const res = await api.post('/api/ai/progress/detailed-summary/');
    return res.data;
  } catch (error) {
    // Fallback to mock data if endpoint doesn't exist
    return {
      summary: {
        overall_progress: '78% improvement over last month',
        strong_areas: ['Rhythm accuracy', 'Chord transitions'],
        areas_for_improvement: ['Scale fluency', 'Dynamic control'],
        ai_recommendations: [
          'Focus on chromatic scale exercises for 10 minutes daily',
          'Practice dynamic control with long bow exercises'
        ],
        detailed_metrics: {
          practice_consistency: 85,
          technique_accuracy: 72,
          musical_expression: 68
        }
      }
    };
  }
};

export default api;
