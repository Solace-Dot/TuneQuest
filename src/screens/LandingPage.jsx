import React from "react";
import { Link } from "react-router-dom";
import styles from "../styles/screens/LandingPage.module.css";

const features = [
  { title: "AI-Powered", text: "Smart guidance for every practice session." },
  { title: "Fast Results", text: "See measurable progress each week." },
  { title: "Personalized", text: "Tailored to your instrument and goals." },
];

function LandingPage() {
  return (
    <div className={styles.heroWrap}>
      <section className="page-shell">
        <div className={styles.heroCard}>
          <div>
            <p className={styles.kicker}>AI-Assisted Instrument Learning</p>
            <h1 className={styles.title}>
              Unlock your musical potential with TuneQuest.
            </h1>
            <p className={styles.subtitle}>
              Interactive practice plans, live feedback, and progress insights
              built for committed musicians.
            </p>
            <div className={styles.ctas}>
              <Link to="/login" className="btn btn-primary">
                Login / Register
              </Link>
              <Link to="/subscribe" className="btn btn-outline">
                Upgrade to Premium
              </Link>
            </div>
            <div className={styles.featureRow}>
              {features.map((f) => (
                <div key={f.title} className={styles.featureBox}>
                  <div className={styles.featureIcon}>★</div>
                  <div>
                    <div className={styles.featureTitle}>{f.title}</div>
                    <div className="small">{f.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.ctaPanel}>
            <div className="pill">Start your musical journey today</div>
            <div className={styles.lockedPanel}>
              <div className={styles.crown}>♛</div>
              <div>
                <h3 className={styles.panelTitle}>Upgrade to Premium</h3>
                <p className="small">
                  Unlock your potential with unlimited plans and feedback.
                </p>
              </div>
              <Link to="/subscribe" className="btn btn-outline">
                Upgrade
              </Link>
            </div>
            <div className={styles.security}>
              <div className={styles.featureIcon}>🔒</div>
              <div>
                <div className={styles.featureTitle}>Secure & Private</div>
                <p className="small">
                  Your progress is encrypted and never shared.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
