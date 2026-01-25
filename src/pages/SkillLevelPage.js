import React from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
import styles from "./Onboarding.module.css";

const levels = [
  { key: "Beginner", icon: "⭐", desc: "Ready to learn basics and chords." },
  { key: "Intermediate", icon: "🎯", desc: "Play simple songs; build theory." },
  {
    key: "Advanced",
    icon: "🚀",
    desc: "Specialized techniques and performance.",
  },
];

function SkillLevelPage() {
  const navigate = useNavigate();
  const { profile, updateProfile, saveProfile, isSaving } = useProfile();

  const handleSelect = (level) => updateProfile({ level });

  const handleNext = async () => {
    await saveProfile({ level: profile.level });
    navigate("/onboarding/goals");
  };

  return (
    <div className="page-shell">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h2 className="section-title">Select Your Skill Level</h2>
            <p className="subtext">
              We will tailor exercises to match your current abilities.
            </p>
          </div>
        </div>
        <div className="card">
          <div className={styles.cards}>
            {levels.map((item) => (
              <div
                key={item.key}
                className={`${styles.card} ${profile.level === item.key ? styles.selected : ""}`}
                onClick={() => handleSelect(item.key)}
              >
                <div className={styles.icon}>{item.icon}</div>
                <div className={styles.title}>{item.key}</div>
                <p className="small">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className={styles.footer}>
            <button
              className="btn btn-outline"
              onClick={() => navigate("/onboarding/instrument")}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkillLevelPage;
