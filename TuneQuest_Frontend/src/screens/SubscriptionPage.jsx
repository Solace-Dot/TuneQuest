import React from "react";
import classNames from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { setSubscription } from "../redux/slices/authSlice";
import styles from "../styles/screens/SubscriptionPage.module.css";

const plans = [
  {
    key: "free",
    title: "Free Trial",
    price: "$0",
    badge: "Current",
    features: [
      { label: "AI-Generated Practice Plans", included: true },
      { label: "Real-time Interactive Feedback", included: true },
      { label: "Unlimited Practice Sessions", included: true },
      { label: "Regenerate AI Plan (Limited)", included: false },
      { label: "Detailed AI Progress Summaries", included: false },
      { label: "Ad-free Experience", included: false },
    ],
  },
  {
    key: "premium",
    title: "Premium Quest",
    price: "$9.99",
    badge: "Upgrade",
    features: [
      { label: "AI-Generated Practice Plans", included: true },
      { label: "Real-time Interactive Feedback", included: true },
      { label: "Unlimited Practice Sessions", included: true },
      { label: "Regenerate AI Plan (Unlimited Refreshes)", included: true },
      { label: "Detailed AI Progress Summaries", included: true },
      { label: "Ad-free Experience", included: true },
    ],
  },
];

function SubscriptionPage() {
  const dispatch = useDispatch();
  const { subscription } = useSelector((state) => state.auth);

  const handleUpgrade = () => {
    dispatch(setSubscription("premium"));
  };

  return (
    <div className="page-shell">
      <Container fluid>
        <div className={styles.hero}>
          <h2 className={styles.title}>Choose Your Plan</h2>
          <p className="subtext">
            Unlock unlimited practice sessions and AI insights to accelerate your
            musical growth.
          </p>
          <div className={styles.current}>
            Current Plan: {subscription === "premium" ? "Premium" : "Free Trial"}
          </div>
        </div>

        <Row className="g-4 justify-content-center">
          {plans.map((plan) => (
            <Col key={plan.key} lg={5} md={12}>
              <div
                className={classNames("card", {
                  [styles.highlight]: plan.key === "premium",
                })}
              >
                <div className={styles.planHead}>
                  <div>
                    <div className={styles.planTitle}>{plan.title}</div>
                    <div className={styles.planSubtitle}>
                      {plan.key === "free"
                        ? "Perfect for getting started"
                        : "Unlock your full potential"}
                    </div>
                  </div>
                  <div className="pill">{plan.badge}</div>
                </div>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className="small">per month</span>
                </div>
                <div className={styles.featureList}>
                  {plan.features.map((feat) => (
                    <div key={feat.label} className={styles.featureItem}>
                      <span
                        className={classNames(
                          styles.icon,
                          feat.included ? styles.iconYes : styles.iconNo,
                        )}
                      >
                        {feat.included ? "✔" : "✕"}
                      </span>
                      <span className={feat.included ? "" : "small"}>
                        {feat.label}
                      </span>
                    </div>
                  ))}
                </div>
                {plan.key === "premium" ? (
                  <button className="btn btn-primary" onClick={handleUpgrade}>
                    Upgrade Now
                  </button>
                ) : (
                  <button className="btn btn-outline" disabled>
                    Your Current Plan
                  </button>
                )}
              </div>
            </Col>
          ))}
        </Row>

        <Row className="mt-5 g-4">
          <Col xs={12}>
            <div className="card">
              <h3>Detailed Feature Comparison</h3>
              <div className={styles.table}>
                <div className={styles.tableRow}>
                  <div>Feature</div>
                  <div>Free</div>
                  <div>Premium</div>
                </div>
                {[
                  "AI-Generated Practice Plans",
                  "Real-time Interactive Feedback",
                  "Unlimited Practice Sessions",
                  "Regenerate AI Plan (Unlimited Refreshes)",
                  "Detailed AI Progress Summaries",
                  "Ad-free Experience",
                ].map((feat) => (
                  <div key={feat} className={styles.tableRow}>
                    <div>{feat}</div>
                    <div>✔</div>
                    <div>✔</div>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>

        <Row className="mt-4 g-4">
          <Col xs={12}>
            <div className="card">
              <h3>Frequently Asked Questions</h3>
              <div className={styles.faqItem}>
                <div className={styles.faqQuestion}>
                  Can I cancel my subscription anytime?
                </div>
                <div className="small">
                  Yes, you can cancel anytime and keep access until the end of your
                  billing period.
                </div>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQuestion}>
                  What payment methods do you accept?
                </div>
                <div className="small">
                  We accept PayPal for all subscriptions. Your payment information is
                  secure and encrypted.
                </div>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQuestion}>Is there a free trial?</div>
                <div className="small">
                  Yes, start with our Free plan to explore all basic features.
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default SubscriptionPage;
