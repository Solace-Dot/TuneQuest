import api from "../api/client";

// --- Auth ---
export const registerUser = (data) => api.post("/api/auth/register/", data);
export const loginUser = (data) => api.post("/api/auth/login/", data);
export const refreshToken = (refresh) => api.post("/api/auth/token/refresh/", { refresh });
export const forgotPassword = (email) => api.post("/api/auth/forgot-password/", { email });

// --- Profile ---
export const getProfile = () => api.get("/api/auth/profile/");
export const updateProfile = (data) => api.put("/api/auth/profile/", data);
export const deleteAccount = () => api.delete("/api/auth/profile/");

// --- Practice Plans --- uh wire to real endpoint later yeh
export const fetchPracticePlan = () => api.get("/api/practice/plan/");

// --- Progress ---
export const fetchProgress = () => api.get("/api/progress/");

// --- Quizzes ---
export const fetchQuizzes = () => api.get("/api/quizzes/");
export const submitQuiz = (id, data) => api.post(`/api/quizzes/${id}/submit/`, data);

// --- Exercises ---
export const fetchExercises = () => api.get("/api/exercises/");