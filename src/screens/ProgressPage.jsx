import React from "react";
import ChartPlaceholder from "../components/ChartPlaceholder";
import ProgressBar from "../components/ProgressBar";
import styles from "../styles/screens/ProgressPage.module.css";

function ProgressPage() {
  return (
    <div className="page-shell">
      <div className="container-fluid">
        <h2 className="section-title">Progress Tracking</h2>
        <p className="subtext">See how your skills are evolving each week.</p>
        <div className="row g-4">
          <div className="col-lg-6 col-md-12">
            <ChartPlaceholder title="Weekly Score" />
          </div>
          <div className="col-lg-6 col-md-12">
            <div className="card">
              <h3>Skill Completion</h3>
              <div className={styles.skillList}>
                {[
                  { label: "Technique", value: 80 },
                  { label: "Harmony", value: 55 },
                  { label: "Ear Training", value: 62 },
                ].map((s) => (
                  <div key={s.label} className={styles.skillItem}>
                    <div className={styles.skillHeader}>
                      <span>{s.label}</span>
                      <span className="small">{s.value}%</span>
                    </div>
                    <ProgressBar value={s.value} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-lg-6 col-md-12">
            <div className="card">
              <h3>AI Summary</h3>
              <p className="small">
                Keep focusing on rhythmic precision. Your timing improved by 12%
                this week.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressPage;
