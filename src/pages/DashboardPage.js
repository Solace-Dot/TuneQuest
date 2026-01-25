import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import ProgressBar from "../components/ProgressBar";
import styles from "./DashboardPage.module.css";
import { fetchProgress } from "../api/client";

function DashboardPage() {
  const { user, subscription } = useAuth();
  const { profile } = useProfile();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    fetchProgress().then(setProgress);
  }, []);

  return (
    <div className="page-shell">
      <div className={styles.greeting}>
        Welcome back, {user?.name || "Musician"}! 🎵
      </div>
      <p className={styles.subtitle}>
        Continue your musical journey with personalized practice.
      </p>

      <div className={styles.grid}>
        <div className="card">
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.label}>Current Goal</div>
              <div className={styles.cardTitle}>{profile.goal}</div>
            </div>
            <div className="pill">{profile.instrument}</div>
          </div>
          <div className={styles.metaRow}>
            <div>
              <div className={styles.metaLabel}>Instrument</div>
              <div className={styles.metaValue}>{profile.instrument}</div>
            </div>
            <div>
              <div className={styles.metaLabel}>Level</div>
              <div className={styles.metaValue}>{profile.level}</div>
            </div>
          </div>
          <div className="divider" />
          <div className={styles.statRow}>
            <div>
              <div className={styles.metaLabel}>This Week</div>
              <div className={styles.metaValue}>Practice Plan</div>
            </div>
            <Link to="/plan">View plan →</Link>
          </div>
        </div>

        <div className="card">
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.label}>This Week's Practice Plan</div>
              <div className={styles.cardTitle}>
                6 of 15 exercises completed
              </div>
            </div>
            <span>✔</span>
          </div>
          <ProgressBar value={40} />
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>
                {progress?.completed ?? 6}
              </div>
              <div className={styles.metaLabel}>Completed</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>
                {progress?.remaining ?? 9}
              </div>
              <div className={styles.metaLabel}>Remaining</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>{progress?.minutes ?? 75}</div>
              <div className={styles.metaLabel}>Minutes</div>
            </div>
          </div>
          <div className="alert">
            You're off to a good start. Keep practicing!
          </div>
        </div>

        <div className="card">
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.label}>Progress Overview</div>
              <div className={styles.cardTitle}>Recent performance</div>
            </div>
            <span>📈</span>
          </div>
          <div className={styles.progressGrid}>
            <div className={styles.largeNumber}>
              {progress?.latestScore ?? 88}
            </div>
            <div>
              <div className={styles.metaLabel}>Latest Score</div>
              <div className={styles.metaValue}>Yesterday</div>
            </div>
            <div>
              <div className={styles.metaLabel}>Current Focus</div>
              <div className={styles.metaValue}>
                {progress?.focus ?? "Rhythmic Precision"}
              </div>
            </div>
          </div>
          <Link
            to="/progress"
            className="btn btn-outline"
            style={{ width: "100%", textAlign: "center" }}
          >
            View Detailed Progress
          </Link>
        </div>

        <div className={styles.actionsCard}>
          <div className={styles.buttonsRow}>
            <Link
              to="/plan"
              className="btn btn-primary"
              style={{ flex: 1, textAlign: "center" }}
            >
              Start Practice
            </Link>
            <Link
              to="/subscribe"
              className="btn btn-outline"
              style={{ flex: 1, textAlign: "center" }}
            >
              Upgrade Premium
            </Link>
          </div>
          {subscription !== "premium" && (
            <div className="small">
              Premium unlocks unlimited AI plan refreshes, progress summaries,
              and ad-free experience.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
