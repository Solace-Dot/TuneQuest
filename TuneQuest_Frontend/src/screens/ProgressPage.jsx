import React, { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { useSelector } from "react-redux";
import ProgressBar from "../components/ProgressBar";
import { Link } from "react-router-dom";
import { generateDetailedProgressSummary } from "../api/client";
import styles from "../styles/screens/ProgressPage.module.css";

// Categories we track skill completion for
const TRACKED_CATEGORIES = ["Technique", "Rhythm", "Knowledge", "Repertoire", "Ear Training"];

const CATEGORY_ICONS = {
  Technique: "🎸",
  Rhythm: "🥁",
  Knowledge: "📚",
  Repertoire: "🎵",
  "Ear Training": "👂",
};

function getCategoryPct(exercises, category) {
  const inCat = exercises.filter((ex) => ex.category === category);
  if (inCat.length === 0) return 0;
  const done = inCat.filter((ex) => ex.status === "Completed").length;
  return Math.round((done / inCat.length) * 100);
}

function ProgressPage() {
  const { subscription } = useSelector((state) => state.auth);
  const { instrument, skillLevel, goal } = useSelector((state) => state.profile);
  const plan        = useSelector((state) => state.aiPlan.plan);
  const exercises   = useSelector((state) => state.aiPlan.exercises);
  const learningGoal = useSelector((state) => state.aiPlan.learningGoal);
  const tokensRemaining = useSelector((state) => state.aiPlan.tokensRemaining);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [detailedSummary, setDetailedSummary] = useState(null);

  const completedSteps = plan?.completed_steps ?? 0;
  const totalSteps     = plan?.total_steps     ?? 0;
  const progressPct    = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const durationGoal   = plan?.duration_goal   ?? 0;

  const overallCompletion = exercises.length > 0
    ? Math.round((exercises.filter((ex) => ex.status === "Completed").length / exercises.length) * 100)
    : 0;

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await generateDetailedProgressSummary();
      setDetailedSummary(data.summary);
    } catch (error) {
      setSummaryError(error.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Container fluid>
        <h2 className="section-title">Progress Tracking</h2>
        <p className="subtext">See how your skills are evolving each week.</p>

        {/* Row 1 — Plan Stats + Tokens */}
        <Row className="g-4">
          <Col lg={4} md={6} xs={12}>
            <div className="card" style={{ height: "100%" }}>
              <div className={styles.cardHeader}>
                <div className={styles.label}>Today's Plan</div>
              </div>
              <div className={styles.cardTitle}>{plan?.focus || plan?.title || "No plan yet"}</div>
              <ProgressBar value={progressPct} />
              <div className={styles.statRow}>
                <div className={styles.stat}>
                  <div className={styles.statNum}>{completedSteps}</div>
                  <div className={styles.statLabel}>Done</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statNum}>{totalSteps - completedSteps}</div>
                  <div className={styles.statLabel}>Left</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statNum}>{durationGoal}m</div>
                  <div className={styles.statLabel}>Goal</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statNum}>{progressPct}%</div>
                  <div className={styles.statLabel}>Complete</div>
                </div>
              </div>
              {!plan && (
                <Link to="/plan/form" className="btn btn-primary" style={{ marginTop: 12, textAlign: "center" }}>
                  ✨ Generate Plan
                </Link>
              )}
            </div>
          </Col>

          <Col lg={4} md={6} xs={12}>
            <div className="card" style={{ height: "100%" }}>
              <div className={styles.cardHeader}>
                <div className={styles.label}>Profile</div>
              </div>
              <div className={styles.profileList}>
                <div className={styles.profileRow}>
                  <span className={styles.profileKey}>Instrument</span>
                  <span className={styles.profileVal}>{instrument || "—"}</span>
                </div>
                <div className={styles.profileRow}>
                  <span className={styles.profileKey}>Skill Level</span>
                  <span className={styles.profileVal}>{skillLevel || "—"}</span>
                </div>
                <div className={styles.profileRow}>
                  <span className={styles.profileKey}>Goal</span>
                  <span className={styles.profileVal}>{learningGoal || goal || "—"}</span>
                </div>
                <div className={styles.profileRow}>
                  <span className={styles.profileKey}>AI Tokens</span>
                  <span className={styles.profileVal} style={{ color: (tokensRemaining ?? 0) > 3 ? "var(--accent)" : "var(--danger)" }}>
                    {tokensRemaining ?? 0} remaining
                  </span>
                </div>
              </div>
              <Link to="/profile" className={styles.editLink}>Edit profile →</Link>
            </div>
          </Col>

          <Col lg={4} md={6} xs={12}>
            <div className="card" style={{ height: "100%" }}>
              <div className={styles.cardHeader}>
                <div className={styles.label}>Overall Exercise Completion</div>
              </div>
              <div className={styles.bigPct}>{overallCompletion}%</div>
              <ProgressBar value={overallCompletion} />
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                {exercises.filter((e) => e.status === "Completed").length} of {exercises.length} exercises complete
              </div>
              {exercises.length === 0 && (
                <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                  Generate a practice plan to see your exercises here.
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* Row 2 — Skill Category Breakdown */}
        <Row className="g-4 mt-2">
          <Col lg={6} md={12}>
            <div className="card">
              <div className={styles.cardHeader}>
                <div className={styles.label}>Skill Breakdown by Category</div>
              </div>
              <div className={styles.skillList}>
                {TRACKED_CATEGORIES.map((cat) => {
                  const pct = getCategoryPct(exercises, cat);
                  const count = exercises.filter((ex) => ex.category === cat).length;
                  return (
                    <div key={cat} className={styles.skillItem}>
                      <div className={styles.skillHeader}>
                        <span>{CATEGORY_ICONS[cat]} {cat}</span>
                        <span className="small">
                          {count > 0 ? `${pct}%` : "No exercises yet"}
                        </span>
                      </div>
                      <ProgressBar value={pct} />
                    </div>
                  );
                })}
              </div>
            </div>
          </Col>

          <Col lg={6} md={12}>
            <div className="card">
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.label}>Detailed AI Progress Summary</div>
                  <div className={styles.cardTitle}>Advanced insights & recommendations</div>
                  {subscription !== "premium" && (
                    <span className="pill" style={{ background: "#f59e0b", color: "white", fontSize: "0.7rem" }}>Premium</span>
                  )}
                </div>
              </div>

              {summaryError ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div style={{ color: "#f87171", marginBottom: "16px", fontWeight: 600 }}>⚠️ {summaryError}</div>
                  {subscription !== "premium" && (
                    <div style={{ marginBottom: 16, padding: 12, background: "rgba(245,158,11,0.1)", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)" }}>
                      <div className="small" style={{ color: "#d97706" }}>
                        Unlock detailed AI progress summaries and more with Premium Quest!
                      </div>
                    </div>
                  )}
                  <button className="btn btn-outline" onClick={handleGenerateSummary}>Try Again</button>
                </div>
              ) : summaryLoading ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div>Generating detailed progress summary... 🤖</div>
                </div>
              ) : detailedSummary ? (
                <div style={{ padding: "16px" }}>
                  <div style={{ marginBottom: 12, fontWeight: 600 }}>{detailedSummary.overall_progress}</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div className="small" style={{ color: "#10b981", fontWeight: 600 }}>Strong Areas:</div>
                      <div className="small">{detailedSummary.strong_areas.join(", ")}</div>
                    </div>
                    <div>
                      <div className="small" style={{ color: "#f59e0b", fontWeight: 600 }}>Areas for Improvement:</div>
                      <div className="small">{detailedSummary.areas_for_improvement.join(", ")}</div>
                    </div>
                    <div>
                      <div className="small" style={{ color: "#8b5cf6", fontWeight: 600 }}>AI Recommendations:</div>
                      {detailedSummary.ai_recommendations.map((rec, i) => (
                        <div key={i} className="small">• {rec}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div style={{ marginBottom: 12 }} className="small">
                    Get personalized AI insights about your practice progress and improvement areas.
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerateSummary}
                    style={subscription !== "premium" ? { opacity: 0.7 } : {}}
                  >
                    Generate Progress Summary
                  </button>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default ProgressPage;
