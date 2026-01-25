import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://api.tunequest.local",
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

export default api;
