import React, { createContext, useContext, useMemo, useState } from "react";

const ProfileContext = createContext(undefined);

function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}

const defaultProfile = {
  instrument: "Guitar",
  level: "Intermediate",
  goal: "Performance Mastery",
  streak: 6,
  practiceMinutes: 75,
};

function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(defaultProfile);
  const [isSaving, setIsSaving] = useState(false);

  const updateProfile = (partial) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  const saveProfile = async (partial) => {
    setIsSaving(true);
    // Replace with API POST/PUT
    await new Promise((resolve) => setTimeout(resolve, 500));
    setProfile((prev) => ({ ...prev, ...partial }));
    setIsSaving(false);
  };

  const value = useMemo(
    () => ({ profile, updateProfile, saveProfile, isSaving }),
    [profile, isSaving],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}


export { ProfileProvider, useProfile };
