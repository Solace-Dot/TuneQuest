import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { setSkillLevel } from "../redux/slices/profileSlice";
import styles from "../styles/screens/Onboarding.module.css";

const levels = [
  { key: "Beginner", icon: "⭐", desc: "Ready to learn basics and chords." },
  { key: "Intermediate", icon: "🎯", desc: "Play simple songs; build theory." },
];

function SkillLevelPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { skillLevel } = useSelector((state) => state.profile);

  const handleSelect = (level) => {
    dispatch(setSkillLevel(level));
  };

  const handleNext = () => {
    navigate("/onboarding/goals");
  };

  return (
    <div className="page-shell">
      <Container>
        <Row className="justify-content-center">
          <Col lg={8} md={10}>
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
                <Row className="g-3">
                  {levels.map((item) => (
                    <Col key={item.key} md={6} xs={12}>
                      <div
                        className={`${styles.card} ${skillLevel === item.key ? styles.selected : ""}`}
                        onClick={() => handleSelect(item.key)}
                      >
                        <div className={styles.icon}>{item.icon}</div>
                        <div className={styles.title}>{item.key}</div>
                        <p className="small">{item.desc}</p>
                      </div>
                    </Col>
                  ))}
                </Row>
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
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default SkillLevelPage;
