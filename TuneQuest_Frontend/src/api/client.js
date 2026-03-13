import axios from "axios";

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("tunequest-auth");
  if (stored) {
    const { token } = JSON.parse(stored);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Stub helpers to keep UI wiring ready
export async function fetchPracticePlan() {
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
}

export async function fetchProgress() {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return {
    streak: 6,
    completed: 6,
    remaining: 9,
    minutes: 75,
    latestScore: 88,
    focus: "Rhythmic Precision",
  };
}

export async function fetchPayPalConfig() {
  const { data } = await api.get("/api/payments/paypal/config/");
  return data;
}

export async function loginUser(credentials) {
  const { data } = await api.post("/api/auth/login/", credentials);
  return data;
}

export async function registerUser(payload) {
  const { data } = await api.post("/api/auth/register/", payload);
  return data;
}

export async function fetchProfileWithToken(token) {
  const { data } = await axios.get(`${API_BASE_URL}/api/auth/profile/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
}

export async function createPayPalOrder(plan = "premium") {
  const { data } = await api.post("/api/payments/paypal/orders/", { plan });
  return data;
}

export async function capturePayPalOrder(orderID) {
  const { data } = await api.post(
    `/api/payments/paypal/orders/${orderID}/capture/`,
  );
  return data;
}

export default api;
