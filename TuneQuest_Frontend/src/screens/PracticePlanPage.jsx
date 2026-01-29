import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPracticePlan } from "../api/client";
import ProgressBar from "../components/ProgressBar";
import styles from "../styles/screens/PracticePlanPage.module.css";

function PracticePlanPage() {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    fetchPracticePlan().then(setPlan);
  }, []);

  if (!plan) return null;

  return (
    <div className="page-shell">
      <div className={styles.header}>
        <div>
          <div className="pill">AI-Generated Practice Plan</div>
          <h2 className={styles.title}>{plan.title}</h2>
          <p className="subtext">{plan.focus}</p>
        </div>
        <div className={styles.actions}>
          <Link to="/dashboard" className="btn btn-outline">
            Back to Dashboard
          </Link>
          <button className="btn btn-primary">Regenerate</button>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Today's Practice Steps</h3>
        <div className={styles.steps}>
          {plan.steps.map((step) => (
            <div key={step.id} className="card">
              <div className={styles.stepHeader}>
                <div className="pill tag-muted">{step.label}</div>
                <div className={styles.status}>{step.status}</div>
              </div>
              <h4 className={styles.stepTitle}>{step.title}</h4>
              <p className="small">{step.detail}</p>
              <div className={styles.stepFooter}>
                <span className="small">⏱ {step.duration} min</span>
                {step.bestScore && (
                  <span className="small">Best Score: {step.bestScore}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.weekHeader}>
          <h3>Weekly Outline</h3>
          <div className="pill">Week 3</div>
        </div>
        <div className={styles.outline}>
          {[
            "Today",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ].map((day, idx) => (
            <div key={day} className="card">
              <div className={styles.outlineRow}>
                <div>
                  <div className={styles.day}>{day}</div>
                  <div className="small">Rhythm & Harmony</div>
                </div>
                <span className="pill tag-muted">{3 + (idx % 2)} steps</span>
              </div>
              <ProgressBar value={40 + idx * 5} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PracticePlanPage;
