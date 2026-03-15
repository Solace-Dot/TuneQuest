import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import ProgressBar from "../components/ProgressBar";
import styles from "../styles/screens/DashboardPage.module.css";
import { fetchProgress } from "../api/client";

function DashboardPage() {
  const { user, subscription } = useSelector((state) => state.auth);
  const { instrument, skillLevel, goal } = useSelector((state) => state.profile);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    fetchProgress().then(setProgress);
  }, []);

  return (
    <div className="page-shell">
      <Container fluid>
        <div className={styles.greeting}>
          Welcome back, {user?.name || "Musician"}! 🎵
        </div>
        <p className={styles.subtitle}>
          Continue your musical journey with personalized practice.
        </p>

        <Row className="g-4">
          <Col lg={6} md={12}>
            <div className="card">
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.label}>Current Goal</div>
                  <div className={styles.cardTitle}>{goal}</div>
                </div>
                <div className="pill">{instrument}</div>
              </div>
              <Row className="g-3 mt-2">
                <Col xs={6}>
                  <div className={styles.metaLabel}>Instrument</div>
                  <div className={styles.metaValue}>{instrument}</div>
                </Col>
                <Col xs={6}>
                  <div className={styles.metaLabel}>Level</div>
                  <div className={styles.metaValue}>{skillLevel}</div>
                </Col>
              </Row>
              <div className="divider mt-3" />
              <div className={styles.statRow}>
                <div>
                  <div className={styles.metaLabel}>This Week</div>
                  <div className={styles.metaValue}>Practice Plan</div>
                </div>
                <div className={styles.textcolor}>
                  <Link to="/plan">View plan →</Link>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={6} md={12}>
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
              <Row className="g-3 mt-3">
                <Col xs={4}>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>
                      {progress?.completed ?? 6}
                    </div>
                    <div className={styles.metaLabel}>Completed</div>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>
                      {progress?.remaining ?? 9}
                    </div>
                    <div className={styles.metaLabel}>Remaining</div>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>{progress?.minutes ?? 75}</div>
                    <div className={styles.metaLabel}>Minutes</div>
                  </div>
                </Col>
              </Row>
              <div className="alert mt-3">
                You're off to a good start. Keep practicing!
              </div>
            </div>
          </Col>
        </Row>

        <Row className="g-4 mt-4">
          <Col lg={12} md={12}>
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
          </Col>
        </Row>

        <Row className="g-4 mt-4">
          <Col lg={12} md={12}>
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
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default DashboardPage;
