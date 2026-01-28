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
      saveProfile(state);
    },
    clearProfile: (state) => {
      state.instrument = null;
      state.skillLevel = null;
      state.goal = null;
      localStorage.removeItem("tunequest-profile");
    },
  },
});

const saveProfile = (state) => {
  const profileData = {
    instrument: state.instrument,
    skillLevel: state.skillLevel,
    goal: state.goal,
  };
  localStorage.setItem("tunequest-profile", JSON.stringify(profileData));
};

export const {
  setInstrument,
  setSkillLevel,
  setGoal,
  setProfile,
  clearProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
