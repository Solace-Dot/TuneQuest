import React from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
import styles from "./Onboarding.module.css";

const instruments = [
  { key: "Guitar", icon: "🎸", desc: "Acoustic or electric. Shred or strum." },
  { key: "Piano", icon: "🎹", desc: "Classical and modern harmony." },
  { key: "Violin", icon: "🎻", desc: "Expressive bowing and melody." },
  { key: "Voice", icon: "🎤", desc: "Pitch, range, and breath control." },
];

function InstrumentPage() {
  const navigate = useNavigate();
  const { profile, updateProfile, saveProfile, isSaving } = useProfile();

  const handleSelect = (instrument) => updateProfile({ instrument });

  const handleNext = async () => {
    await saveProfile({ instrument: profile.instrument });
    navigate("/onboarding/skill");
  };

  return (
    <div className="page-shell">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h2 className="section-title">Personalize Your Profile</h2>
            <p className="subtext">
              Choose your instrument so we can tailor your plan.
            </p>
          </div>
        </div>
        <div className="card">
          <h3>Choose Your Instrument</h3>
          <p className={styles.helper}>Pick what you want to master first.</p>
          <div className={styles.cards}>
            {instruments.map((item) => (
              <div
                key={item.key}
                className={`${styles.card} ${profile.instrument === item.key ? styles.selected : ""}`}
                onClick={() => handleSelect(item.key)}
              >
                <div className={styles.icon}>{item.icon}</div>
                <div className={styles.title}>{item.key}</div>
                <p className="small">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className={styles.footer}>
            <button className="btn btn-outline" onClick={() => navigate(-1)}>
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

export default InstrumentPage;
