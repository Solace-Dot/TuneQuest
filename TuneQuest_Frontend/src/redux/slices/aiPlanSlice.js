import { createSlice } from "@reduxjs/toolkit";

const PLAN_PHASES = ["Warm-up", "Core Work", "Challenge", "Cool Down"];
const QUIZ_CATEGORIES = new Set(["Quizzes", "Knowledge", "Ear Training"]);

// Transforms raw AI plan steps → PracticePlanPage-compatible plan object
function adaptPlanForPage(rawPlan) {
  const steps = (rawPlan.steps || []).map((step, idx) => ({
    id: step.id,
    phase: step.phase || PLAN_PHASES[Math.min(idx, PLAN_PHASES.length - 1)],
    exercise_id: step.id,
    title: step.title,
    category: step.category,
    route_to: step.route_to || (QUIZ_CATEGORIES.has(step.category) ? "QuizPage" : "SongManager"),
    status: step.status || "Not Started",
    skill_level: step.skill_level || "Beginner",
    duration_minutes: step.duration_minutes || 10,
    lore_description: step.description || step.lore_description,
    best_score: step.best_score ?? null,
    accuracy: step.accuracy ?? null,
    avg_completion_time: step.avg_completion_time ?? null,
    technical_payload: {},
    songPayload: step.songPayload || null, // Preserve songPayload from backend
  }));

  const completedSteps = steps.filter((s) => s.status === "Completed").length;

  return {
    title: rawPlan.plan_title || rawPlan.title || "Your Practice Session",
    focus: rawPlan.focus_summary || rawPlan.focus || "Custom Plan",
    duration_goal: steps.reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
    streak: 0,
    total_steps: steps.length,
    completed_steps: rawPlan.completed_steps ?? completedSteps,
    steps,
  };
}

// Transforms raw AI plan steps → ExercisesPage-compatible exercise list
function adaptStepsForExercises(rawPlan) {
  return (rawPlan.steps || []).map((step, idx) => ({
    id: step.id,
    phase: step.phase || PLAN_PHASES[Math.min(idx, PLAN_PHASES.length - 1)],
    title: step.title,
    category: step.category,
    route_to: step.route_to || (QUIZ_CATEGORIES.has(step.category) ? "QuizPage" : "SongManager"),
    status: step.status || "Not Started",
    skill_level: step.skill_level || "Beginner",
    duration_minutes: step.duration_minutes || 10,
    best_score: step.best_score ?? null,
    accuracy: step.accuracy ?? null,
    avg_completion_time: step.avg_completion_time ?? null,
    lore_description: step.description || step.lore_description,
    technical_payload: step.technical_payload || {},
    songPayload: step.songPayload || null, // Preserve songPayload from backend
  }));
}

const aiPlanSlice = createSlice({
  name: "aiPlan",
  initialState: {
    dailyPlanId: null,     // UUID of the DailyPlan — used to save changes back to backend
    plan: null,            // Adapted for PracticePlanPage
    exercises: [],         // Adapted for ExercisesPage
    quizzes: [],           // Adapted for QuizPage
    tokensRemaining: 10,
    skillLevel: 'Beginner',   // From the form — used by song launcher
    instrument: 'Guitar',     // From the form — passed to song timeline API
    learningGoal: null,       // 'Performance Mastery' | 'Songwriting & Composition' | 'Boost Music Theory'
    frequency: null,          // 'Daily' | '3x a week' | 'Just for today'
    planStartDate: null,      // ISO timestamp — used by graduation gate
    recommendedLessonSlugs: [],
    // songCache[stepId] = { songTitle, songPayload } — avoids re-generating the same song
    songCache: {},
    // quizCache[stepId] = { quizData, quizObject } — avoids re-generating the same quiz
    quizCache: {},
  },
  reducers: {
    // payload: { plan, tokensRemaining, skillLevel, instrument, learningGoal, frequency, recommendedLessonSlugs, dailyPlanId, exerciseIds }
    storePlan(state, action) {
      const raw = action.payload.plan;
      
      // If plan.steps exists, use it; otherwise try to reconstruct from exerciseIds (if provided)
      if (!raw.steps && action.payload.exerciseIds && action.payload.exerciseIds.length > 0) {
        // Fallback: create minimal exercise objects from exerciseIds if steps data is missing
        raw.steps = action.payload.exerciseIds.map((id) => ({
          id,
          title: `Exercise ${id}`,
          category: 'Technique',
          status: 'Not Started',
          skill_level: 'Beginner',
        }));
      }
      
      state.plan = adaptPlanForPage(raw);
      state.exercises = adaptStepsForExercises(raw);
      // Store the daily plan ID for later updates
      if (action.payload.dailyPlanId) state.dailyPlanId = action.payload.dailyPlanId;
      // Only overwrite when a real value is provided
      if (action.payload.tokensRemaining !== undefined) {
        state.tokensRemaining = action.payload.tokensRemaining;
      }
      if (action.payload.skillLevel) state.skillLevel = action.payload.skillLevel;
      if (action.payload.instrument) state.instrument = action.payload.instrument;
      if (action.payload.learningGoal) state.learningGoal = action.payload.learningGoal;
      if (action.payload.frequency) state.frequency = action.payload.frequency;
      // Record plan start date only for a brand-new plan (not on app-restore)
      if (action.payload.planStartDate !== undefined) {
        state.planStartDate = action.payload.planStartDate;
      } else if (!state.planStartDate) {
        state.planStartDate = new Date().toISOString();
      }
      state.recommendedLessonSlugs = action.payload.recommendedLessonSlugs || [];
      state.songCache = {}; // Clear cache when a new plan is loaded
      state.quizCache = {}; // Clear quiz cache when a new plan is loaded
    },
    // payload: <array of quiz objects>
    storeQuizzes(state, action) {
      state.quizzes = action.payload || [];
    },
    // payload: { stepId, quizData, quizObject }
    cacheQuiz(state, action) {
      const { stepId, quizData, quizObject } = action.payload;
      state.quizCache[stepId] = { quizData, quizObject };
    },
    setTokens(state, action) {
      state.tokensRemaining = action.payload;
    },
    clearPlan(state) {
      state.plan = null;
      state.exercises = [];
      state.songCache = {};
      state.quizCache = {};
    },
    // payload: { stepId: string, songTitle: string, songPayload: object }
    cacheSong(state, action) {
      const { stepId, songTitle, songPayload } = action.payload;
      state.songCache[stepId] = { songTitle, songPayload };
    },
    // payload: { stepId, status?, best_score?, accuracy?, avg_completion_time? }
    updatePracticeStepProgress(state, action) {
      const { stepId, status, best_score, accuracy, avg_completion_time } = action.payload;
      if (!stepId) return;

      const applyProgress = (item) => {
        if (!item || item.id !== stepId) return item;
        if (status) item.status = status;
        if (best_score !== undefined) {
          item.best_score = item.best_score == null ? best_score : Math.max(item.best_score, best_score);
        }
        if (accuracy !== undefined) item.accuracy = accuracy;
        if (avg_completion_time !== undefined) {
          item.avg_completion_time =
            item.avg_completion_time == null
              ? avg_completion_time
              : (item.avg_completion_time + avg_completion_time) / 2;
        }
        return item;
      };

      state.exercises = (state.exercises || []).map((e) => applyProgress({ ...e }));

      if (state.plan?.steps) {
        state.plan.steps = state.plan.steps.map((s) => applyProgress({ ...s }));
        state.plan.total_steps = state.plan.steps.length;
        state.plan.completed_steps = state.plan.steps.filter((s) => s.status === 'Completed').length;
      }
    },
    clearQuizzes(state) {
      state.quizzes = [];
    },
    // payload: stepId to remove from quiz cache
    removeQuizFromCache(state, action) {
      const stepId = action.payload;
      if (state.quizCache[stepId]) {
        delete state.quizCache[stepId];
      }
    },
    // payload: quiz id to remove from quizzes list
    removeQuiz(state, action) {
      const quizId = action.payload;
      state.quizzes = state.quizzes.filter((q) => q.id !== quizId);
    },
    // payload: { id: exerciseId, songPayload: object }
    updateExerciseSongPayload(state, action) {
      const { id, songPayload } = action.payload;
      const exercise = state.exercises.find(e => e.id === id);
      if (exercise) {
        exercise.songPayload = songPayload;
      }
    },
  },
});

export const {
  storePlan,
  storeQuizzes,
  setTokens,
  clearPlan,
  clearQuizzes,
  cacheSong,
  cacheQuiz,
  removeQuizFromCache,
  removeQuiz,
  updatePracticeStepProgress,
  updateExerciseSongPayload,
} = aiPlanSlice.actions;
export default aiPlanSlice.reducer;
