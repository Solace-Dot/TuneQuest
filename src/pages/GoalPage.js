import React from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
import styles from "./Onboarding.module.css";

const goals = [
  {
    key: "Performance Mastery",
    icon: "🎵",
    desc: "Prepare for live performances and auditions.",
  },
  {
    key: "Songwriting & Composition",
    icon: "🎼",
    desc: "Develop skills for creating original music.",
  },
  {
    key: "Boost Music Theory",
    icon: "📚",
    desc: "Deepen understanding of musical structure.",
  },
];

function GoalPage() {
  const navigate = useNavigate();
  const { profile, updateProfile, saveProfile, isSaving } = useProfile();

  const handleSelect = (goal) => updateProfile({ goal });

  const handleNext = async () => {
    await saveProfile({ goal: profile.goal });
    navigate("/dashboard");
  };

  return (
    <div className="page-shell">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h2 className="section-title">What's Your Learning Goal?</h2>
            <p className="subtext">
              Choose where you want to focus during practice.
            </p>
          </div>
        </div>
        <div className="card">
          <div className={styles.cards}>
            {goals.map((item) => (
              <div
                key={item.key}
                className={`${styles.card} ${profile.goal === item.key ? styles.selected : ""}`}
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
              onClick={() => navigate("/onboarding/skill")}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoalPage;
