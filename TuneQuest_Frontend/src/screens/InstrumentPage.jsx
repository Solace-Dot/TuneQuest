import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { setInstrument } from "../redux/slices/profileSlice";
import styles from "../styles/screens/Onboarding.module.css";

const instruments = [
  { key: "Guitar", icon: "🎸", desc: "Acoustic or electric. Shred or strum." },
  { key: "Piano", icon: "🎹", desc: "Classical and modern harmony." },
  { key: "Violin", icon: "🎻", desc: "Expressive bowing and melody." },
  { key: "Voice", icon: "🎤", desc: "Pitch, range, and breath control." },
];

function InstrumentPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { instrument } = useSelector((state) => state.profile);

  const handleSelect = (selected) => {
    dispatch(setInstrument(selected));
  };

  const handleNext = () => {
    if (instrument) {
      navigate("/onboarding/skill");
    }
  };

  return (
    <div className="page-shell">
      <Container>
        <Row className="justify-content-center">
          <Col lg={8} md={10}>
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
                <Row className="g-3">
                  {instruments.map((item) => (
                    <Col key={item.key} md={6} xs={12}>
                      <div
                        className={`${styles.card} ${instrument === item.key ? styles.selected : ""}`}
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
                  <button className="btn btn-outline" onClick={() => navigate(-1)}>
                    Back
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={!instrument}
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

export default InstrumentPage;
