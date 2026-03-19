import React, { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { setSubscription } from "../redux/slices/authSlice";
import { setTokens } from "../redux/slices/aiPlanSlice";
import {
  API_BASE_URL,
  capturePayPalOrder,
  createPayPalOrder,
  fetchPayPalConfig,
} from "../api/client";
import styles from "../styles/screens/SubscriptionPage.module.css";

const PREMIUM_TOKEN_LIMIT = 50;
const FREE_TOKEN_LIMIT = 10;

const plans = [
  {
    key: "free",
    title: "Free Trial",
    price: "$0",
    badge: "Current",
    description: "Perfect for exploring TuneQuest",
    features: [
      { label: "AI-Generated Practice Plans", included: true },
      { label: "Real-time Interactive Feedback", included: true },
      { label: "Unlimited Practice Sessions", included: true },
      { label: "10 AI Tokens / month", included: true },
      { label: "Song Timeline Generation", included: true },
      { label: "AI Quiz Generation", included: true },
      { label: "Basic Progress Tracking", included: true },
      { label: "Regenerate AI Plan (Limited)", included: false },
      { label: "Detailed AI Progress Summaries", included: false },
      { label: "Priority Support", included: false },
      { label: "Ad-free Experience", included: false },
      { label: "Monthly Insights Report", included: false },
    ],
  },
  {
    key: "premium",
    title: "Premium Quest",
    price: "$9.99",
    badge: "Most Popular",
    description: "For serious musicians",
    features: [
      { label: "AI-Generated Practice Plans", included: true },
      { label: "Real-time Interactive Feedback", included: true },
      { label: "Unlimited Practice Sessions", included: true },
      { label: "50 AI Tokens / month (5× more)", included: true },
      { label: "Song Timeline Generation", included: true },
      { label: "AI Quiz Generation", included: true },
      { label: "Basic Progress Tracking", included: true },
      { label: "Regenerate AI Plan (Unlimited Refreshes)", included: true },
      { label: "Detailed AI Progress Summaries", included: true },
      { label: "Priority Support", included: true },
      { label: "Ad-free Experience", included: true },
      { label: "Monthly Insights Report", included: true },
    ],
  },
];

function SubscriptionPage() {
  const dispatch = useDispatch();
  const { subscription, token } = useSelector((state) => state.auth);
  const [paypalConfig, setPayPalConfig] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const paypalOptions = useMemo(() => {
    if (!paypalConfig?.clientId) {
      return null;
    }

    return {
      "client-id": paypalConfig.clientId,
      currency: paypalConfig.currency || "USD",
      intent: "capture",
    };
  }, [paypalConfig]);

  useEffect(() => {
    async function loadConfig() {
      if (!token) {
        setPayPalConfig(null);
        setPaymentError("");
        setIsConfigLoading(false);
        return;
      }

      setIsConfigLoading(true);
      setPaymentError("");

      try {
        const config = await fetchPayPalConfig();
        setPayPalConfig(config);
      } catch (err) {
        setPayPalConfig(null);
        const isNetworkError = !err?.response;
        setPaymentError(
          err?.response?.data?.detail ||
            (isNetworkError
              ? `Cannot reach backend API at ${API_BASE_URL}.`
              : "Unable to load PayPal checkout right now."),
        );
      } finally {
        setIsConfigLoading(false);
      }
    }

    loadConfig();
  }, [token]);

  const createOrder = async () => {
    setPaymentError("");
    const data = await createPayPalOrder("premium");
    return data.orderID;
  };

  const handleApprove = async (data) => {
    const result = await capturePayPalOrder(data.orderID);
    dispatch(setSubscription("premium"));
    // Don't set tokens here - let backend return actual token count
    if (result?.tokens_remaining) {
      dispatch(setTokens(result.tokens_remaining));
    }
    setPaymentSuccess("Payment complete. Your Premium plan is now active.");
    return result;
  };

  const handleMockCheckout = async () => {
    try {
      setPaymentError("");
      const result = await capturePayPalOrder(`MOCK-LOCAL-${Date.now()}`);
      dispatch(setSubscription("premium"));
      // Don't set tokens here - let backend return actual token count
      if (result?.tokens_remaining) {
        dispatch(setTokens(result.tokens_remaining));
      }
      setPaymentSuccess(
        result?.detail || "Mock payment complete. Your Premium plan is now active.",
      );
    } catch (err) {
      setPaymentError(err?.response?.data?.detail || "Mock payment failed.");
    }
  };

  return (
    <div className="page-shell">
      <Container fluid>
        <div className={styles.hero}>
          <h2 className={styles.title}>Choose Your Plan</h2>
          <p className="subtext">
            Unlock unlimited practice sessions and AI insights to accelerate
            your musical growth. Start free, upgrade anytime.
          </p>
          <br />
          <div className={styles.current}>
            Current Plan:{" "}
            {subscription === "premium" ? "Premium Quest" : "Free Trial"}
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
                      {plan.description}
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
                <br />
                {plan.key === "premium" ? (
                  subscription === "premium" ? (
                    <button className="btn btn-outline" disabled>
                      Your Current Plan
                    </button>
                  ) : !token ? (
                    <button className="btn btn-outline" disabled>
                      Login to Upgrade
                    </button>
                  ) : isConfigLoading ? (
                    <button className="btn btn-outline" disabled>
                      Loading Checkout...
                    </button>
                  ) : paymentError && !paypalOptions ? (
                    <button className="btn btn-outline" disabled>
                      Checkout Unavailable
                    </button>
                  ) : !paypalOptions ? (
                    <button className="btn btn-outline" disabled>
                      PayPal Unavailable
                    </button>
                  ) : paypalConfig?.mockMode ? (
                    <button className="btn btn-primary" onClick={handleMockCheckout}>
                      Simulate PayPal Payment
                    </button>
                  ) : (
                    <div className={styles.paypalWrap}>
                      <PayPalScriptProvider options={paypalOptions}>
                        <PayPalButtons
                          style={{
                            layout: "vertical",
                            shape: "rect",
                            label: "paypal",
                          }}
                          createOrder={createOrder}
                          onApprove={handleApprove}
                          onCancel={() =>
                            setPaymentError("Payment was cancelled.")
                          }
                          onError={() =>
                            setPaymentError(
                              "PayPal checkout failed. Please try again.",
                            )
                          }
                        />
                      </PayPalScriptProvider>
                    </div>
                  )
                ) : subscription === "free" ? (
                  <button className="btn btn-outline" disabled>
                    Your Current Plan
                  </button>
                ) : (
                  <button className="btn btn-outline" disabled>
                    Not Available
                  </button>
                )}
              </div>
            </Col>
          ))}
        </Row>

        {(paymentError || paymentSuccess) && (
          <Row className="mt-3">
            <Col xs={12}>
              {paymentError && (
                <div className="alert alert-error">{paymentError}</div>
              )}
              {paymentSuccess && (
                <div className="alert alert-success">{paymentSuccess}</div>
              )}
            </Col>
          </Row>
        )}

        <Row className="mt-4 g-4">
          <Col xs={12}>
            <div className="card">
              <h3>Frequently Asked Questions</h3>
              <div className={styles.faqItem}>
                <div className={styles.faqQuestion}>
                  Can I cancel my subscription anytime?
                </div>
                <div className="small">
                  Yes, you can cancel your Premium plan anytime from the Settings page. Your Premium access will continue until the end of your billing period.
                </div>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQuestion}>
                  What payment methods do you accept?
                </div>
                <div className="small">
                  We accept PayPal for all subscriptions. Your payment information is secure and encrypted.
                </div>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQuestion}>Is there a free trial?</div>
                <div className="small">
                  Yes! Start with our Free plan to explore all basic features: 10 AI tokens per month, unlimited practice sessions, and access to all learning tools.
                </div>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQuestion}>
                  How many AI tokens do I need?
                </div>
                <div className="small">
                  Each AI action (practice plan, quiz, song timeline, progress summary, or chat message) costs 1 token. Free tier gets 10/month, Premium gets 50/month.
                </div>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQuestion}>
                  Do unused tokens roll over?
                </div>
                <div className="small">
                  No, tokens reset each month. Premium members can regenerate practice plans unlimited times, while free users are limited to 3 per month.
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
