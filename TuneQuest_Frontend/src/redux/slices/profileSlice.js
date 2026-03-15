import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  instrument: localStorage.getItem("tunequest-profile")
    ? JSON.parse(localStorage.getItem("tunequest-profile")).instrument
    : null,
  skillLevel: localStorage.getItem("tunequest-profile")
    ? JSON.parse(localStorage.getItem("tunequest-profile")).skillLevel
    : null,
  goal: localStorage.getItem("tunequest-profile")
    ? JSON.parse(localStorage.getItem("tunequest-profile")).goal
    : null,
  isCompleted: localStorage.getItem("tunequest-profile")
    ? JSON.parse(localStorage.getItem("tunequest-profile")).isCompleted || false
    : false,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setInstrument: (state, action) => {
      state.instrument = action.payload;
      saveProfile(state);
    },
    setSkillLevel: (state, action) => {
      state.skillLevel = action.payload;
      saveProfile(state);
    },
    setGoal: (state, action) => {
      state.goal = action.payload;
      saveProfile(state);
    },
    setProfile: (state, action) => {
      state.instrument = action.payload.instrument;
      state.skillLevel = action.payload.skillLevel;
      state.goal = action.payload.goal;
      state.isCompleted = action.payload.isCompleted || false;
      saveProfile(state);
    },
    setProfileCompletion: (state, action) => {
      state.isCompleted = action.payload.is_completed || action.payload.isCompleted;
      state.instrument = action.payload.instrument_name || state.instrument;
      state.skillLevel = action.payload.skill_level || state.skillLevel;
      saveProfile(state);
    },
    clearProfile: (state) => {
      state.instrument = null;
      state.skillLevel = null;
      state.goal = null;
      state.isCompleted = false;
      localStorage.removeItem("tunequest-profile");
    },
  },
});

const saveProfile = (state) => {
  const profileData = {
    instrument: state.instrument,
    skillLevel: state.skillLevel,
    goal: state.goal,
    isCompleted: state.isCompleted,
  };
  localStorage.setItem("tunequest-profile", JSON.stringify(profileData));
};

export const {
  setInstrument,
  setSkillLevel,
  setGoal,
  setProfile,
  setProfileCompletion,
  clearProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
