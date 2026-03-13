import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import ProgressBar from "../components/ProgressBar";
import styles from "../styles/screens/DashboardPage.module.css";

const QUICK_LINKS = [
  { to: "/plan",      icon: "🎯", label: "Practice Plan",  desc: "Jump into today's steps" },
  { to: "/learn",     icon: "📖", label: "Learn",          desc: "Lessons & theory" },
  { to: "/quiz",      icon: "📝", label: "Quizzes",        desc: "Test your knowledge" },
  { to: "/plan/form", icon: "✨", label: "Generate Plan",  desc: "New AI practice plan" },
];

function DashboardPage() {
  const { user, subscription } = useSelector((state) => state.auth);
  const { instrument, skillLevel, goal } = useSelector((state) => state.profile);
  const plan           = useSelector((state) => state.aiPlan.plan);
  const tokensRemaining = useSelector((state) => state.aiPlan.tokensRemaining);

  const completedSteps = plan?.completed_steps ?? 0;
  const totalSteps     = plan?.total_steps     ?? 0;
  const progressPct    = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const durationGoal   = plan?.duration_goal   ?? 0;
  const profileCompletion = Math.round(
    ([!!instrument, !!skillLevel, !!goal, !!user?.username].filter(Boolean).length / 4) * 100
  );

  return (
    <div className="page-shell">
      <Container fluid>
        {/* Greeting */}
        <div className={styles.greeting}>
          Welcome back, {user?.username || "Musician"}! 👋
        </div>
        <p className={styles.subtitle}>
          Continue your musical journey with personalized practice.
        </p>

        {/* Row 1 — Profile + Today's Plan */}
        <Row className="g-4">
          {/* Profile card */}
          <Col lg={5} md={12}>
            <div className="card" style={{ height: "100%" }}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.label}>Your Profile</div>
                  <div className={styles.cardTitle}>{goal || "Set your first goal"}</div>
                </div>
                <div className="pill">{instrument || "Instrument"}</div>
              </div>

              <div className={styles.profileGrid}>
                <div>
                  <div className={styles.metaLabel}>Instrument</div>
                  <div className={styles.metaValue}>{instrument || "—"}</div>
                </div>
                <div>
                  <div className={styles.metaLabel}>Level</div>
                  <div className={styles.metaValue}>{skillLevel || "—"}</div>
                </div>
                <div>
                  <div className={styles.metaLabel}>Subscription</div>
                  <div className={styles.metaValue} style={{ textTransform: "capitalize" }}>
                    {subscription || "Free"}
                  </div>
                </div>
                <div>
                  <div className={styles.metaLabel}>AI Tokens</div>
                  <div className={styles.metaValue}>
                    <span style={{ color: tokensRemaining > 0 ? "var(--accent)" : "var(--danger)" }}>
                      {tokensRemaining ?? "—"} remaining
                    </span>
                  </div>
                </div>
              </div>

              <div className="divider mt-3" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span className={styles.metaLabel}>Profile Completion</span>
                <span className={styles.metaValue}>{profileCompletion}%</span>
              </div>
              <ProgressBar value={profileCompletion} />

              <Link to="/profile" className={styles.cardLink}>Edit profile →</Link>
            </div>
          </Col>

          {/* Today's Plan card */}
          <Col lg={7} md={12}>
            <div className="card" style={{ height: "100%" }}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.label}>Today's Practice Plan</div>
                  <div className={styles.cardTitle}>
                    {plan ? plan.focus || plan.title : "No plan generated yet"}
                  </div>
                </div>
                <span style={{ fontSize: 22 }}>🎸</span>
              </div>

              {plan ? (
                <>
                  <ProgressBar value={progressPct} />
                  <div className={styles.planMeta}>
                    <div className={styles.statBox}>
                      <div className={styles.statNumber}>{completedSteps}</div>
                      <div className={styles.metaLabel}>Done</div>
                    </div>
                    <div className={styles.statBox}>
                      <div className={styles.statNumber}>{totalSteps - completedSteps}</div>
                      <div className={styles.metaLabel}>Remaining</div>
                    </div>
                    <div className={styles.statBox}>
                      <div className={styles.statNumber}>{durationGoal}</div>
                      <div className={styles.metaLabel}>Min Goal</div>
                    </div>
                    <div className={styles.statBox}>
                      <div className={styles.statNumber}>{progressPct}%</div>
                      <div className={styles.metaLabel}>Complete</div>
                    </div>
                  </div>
                  <Link to="/plan" className="btn btn-primary" style={{ width: "100%", textAlign: "center", marginTop: 4 }}>
                    ▶ Continue Practice
                  </Link>
                </>
              ) : (
                <div className={styles.emptyPlan}>
                  <div className={styles.emptyPlanIcon}>📋</div>
                  <p>You haven't generated a practice plan yet.</p>
                  <Link to="/plan/form" className="btn btn-primary" style={{ textAlign: "center" }}>
                    ✨ Generate My Plan
                  </Link>
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* Row 2 — Quick Links */}
        <Row className="g-3 mt-3">
          {QUICK_LINKS.map((link) => (
            <Col key={link.to} xs={6} md={3}>
              <Link to={link.to} className={styles.quickCard}>
                <div className={styles.quickIcon}>{link.icon}</div>
                <div className={styles.quickLabel}>{link.label}</div>
                <div className={styles.quickDesc}>{link.desc}</div>
              </Link>
            </Col>
          ))}
        </Row>

        {/* Premium upsell — only for free users */}
        {subscription !== "premium" && (
          <div className={styles.upsellBanner}>
            <div>
              <strong>Upgrade to Premium</strong>
              <span className={styles.upsellText}> — Unlimited AI plan refreshes, detailed progress reports, and ad-free.</span>
            </div>
            <Link to="/subscribe" className="btn btn-outline" style={{ whiteSpace: "nowrap" }}>
              Upgrade →
            </Link>
          </div>
        )}
      </Container>
    </div>
  );
}

export default DashboardPage;
