import React from "react";
import classNames from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { setSubscription } from "../redux/slices/authSlice";
import { setTokens } from "../redux/slices/aiPlanSlice";
import styles from "../styles/screens/SubscriptionPage.module.css";

const PREMIUM_TOKEN_LIMIT = 50;

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
  const { subscription } = useSelector((state) => state.auth);

  const handleUpgrade = () => {
    dispatch(setSubscription("premium"));
    dispatch(setTokens(PREMIUM_TOKEN_LIMIT));
  };

  return (
    <div className="page-shell">
      <Container fluid>
        <div className={styles.hero}>
          <h2 className={styles.title}>Choose Your Plan</h2>
          <p className="subtext">
            Unlock unlimited practice sessions and AI insights to accelerate your
            musical growth. Start free, upgrade anytime.
          </p>
          <br />
          <div className={styles.current}>
            Current Plan: {subscription === "premium" ? "🌟 Premium Quest" : "📚 Free Trial"}
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
                    <div className={styles.planSubtitle}>{plan.description}</div>
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
            <div className="card" style={{ background: "linear-gradient(135deg, rgba(129,92,249,0.1) 0%, rgba(147,112,219,0.1) 100%)" }}>
              <h3 style={{ color: "var(--primary-soft)", marginBottom: "24px" }}>✨ Why Choose Premium?</h3>
              <Row style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
                <div>
                  <h4 style={{ marginBottom: "8px" }}>🎯 More Tokens</h4>
                  <p className="small" style={{ margin: 0, color: "var(--muted)" }}>5× more AI tokens (50/month) means unlimited plan generations, quizzes, and progress analysis.</p>
                </div>
                <div>
                  <h4 style={{ marginBottom: "8px" }}>📊 Deep Insights</h4>
                  <p className="small" style={{ margin: 0, color: "var(--muted)" }}>Detailed AI-powered progress summaries and monthly insights reports personalized to your learning style.</p>
                </div>
                <div>
                  <h4 style={{ marginBottom: "8px" }}>🚀 No Limits</h4>
                  <p className="small" style={{ margin: 0, color: "var(--muted)" }}>Unlimited plan regenerations, priority support, and early access to new features and instruments.</p>
                </div>
                <div>
                  <h4 style={{ marginBottom: "8px" }}>🎨 Premium Experience</h4>
                  <p className="small" style={{ margin: 0, color: "var(--muted)" }}>Ad-free interface means pure focus on your practice. Full app experience without distractions.</p>
                </div>
                <div>
                  <h4 style={{ marginBottom: "8px" }}>🎼 Community</h4>
                  <p className="small" style={{ margin: 0, color: "var(--muted)" }}>Join exclusive live sessions with music coaches and connect with premium musicians worldwide.</p>
                </div>
                <div>
                  <h4 style={{ marginBottom: "8px" }}>💰 Value</h4>
                  <p className="small" style={{ margin: 0, color: "var(--muted)" }}>Just $9.99/month = 33¢ per day. Less than a single guitar lesson while practicing unlimited songs!</p>
                </div>
              </Row>
            </div>
          </Col>
        </Row>

        <Row className="mt-5 g-4">
          <Col xs={12}>
            <div className="card">
              <h3>Detailed Feature Comparison</h3>
              <div className={styles.table}>
                <div className={styles.tableRow} style={{ fontWeight: 600, background: "rgba(0,0,0,0.05)" }}>
                  <div style={{ flex: 2 }}>Feature</div>
                  <div style={{ flex: 1, textAlign: "center" }}>Free</div>
                  <div style={{ flex: 1, textAlign: "center" }}>Premium</div>
                </div>
                {[
                  { label: "AI-Generated Practice Plans", free: "✔", premium: "✔" },
                  { label: "Real-time Interactive Feedback", free: "✔", premium: "✔" },
                  { label: "Unlimited Practice Sessions", free: "✔", premium: "✔" },
                  { label: "AI Tokens per Month", free: "10", premium: "50" },
                  { label: "Song Timeline Generation", free: "✔", premium: "✔" },
                  { label: "AI Quiz Generation", free: "✔", premium: "✔" },
                  { label: "Basic Progress Tracking", free: "✔", premium: "✔" },
                  { label: "Regenerate AI Plans (Unlimited)", free: "✕", premium: "✔" },
                  { label: "Detailed AI Progress Summaries", free: "✕", premium: "✔" },
                  { label: "Priority Email Support", free: "✕", premium: "✔" },
                  { label: "Ad-free Experience", free: "✕", premium: "✔" },
                  { label: "Monthly Insights Report", free: "✕", premium: "✔" },
                  { label: "Skill-specific Recommendations", free: "✕", premium: "✔" },
                  { label: "Early Access to New Features", free: "✕", premium: "✔" },
                ].map((feat, i) => (
                  <div key={feat.label} className={styles.tableRow} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" }}>
                    <div style={{ flex: 2 }}>{feat.label}</div>
                    <div style={{ flex: 1, textAlign: "center", color: feat.free === "✔" ? "var(--accent)" : "#999" }}>{feat.free}</div>
                    <div style={{ flex: 1, textAlign: "center", color: feat.premium === "✔" ? "var(--accent)" : "#999" }}>{feat.premium}</div>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>

        <Row className="mt-4 g-4">
          <Col xs={12}>
            <div className="card">
              <h3 style={{ marginBottom: "24px" }}>Frequently Asked Questions</h3>
              <div style={{ display: "grid", gap: "20px" }}>
                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>💳 What payment methods do you accept?</div>
                  <div className="small">
                    We currently accept PayPal for all subscriptions. Your payment information is secure and encrypted using industry-standard SSL. We're adding more payment methods soon!
                  </div>
                </div>

                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>❌ Can I cancel my subscription anytime?</div>
                  <div className="small">
                    Yes! You can cancel at any time with no penalties. Your access continues until the end of your current billing period. If you cancel mid-month, you'll still have full Premium access until then.
                  </div>
                </div>

                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>🆓 Is there a free trial?</div>
                  <div className="small">
                    Yes! Start with our Free plan to explore all core features. You get 10 AI tokens per month to try song generation, quizzes, and practice plans. Upgrade to Premium whenever you're ready.
                  </div>
                </div>

                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>🎫 What are AI tokens?</div>
                  <div className="small">
                    AI tokens let you generate personalized content powered by AI. Each generation (practice plan, song timeline, quiz, or progress summary) costs 1 token. Free users get 10/month, Premium users get 50/month. Unused tokens don't carry over.
                  </div>
                </div>

                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>📊 What's the difference between Free and Premium?</div>
                  <div className="small">
                    Both plans include unlimited practice sessions and real-time feedback. Premium gives you 5× more AI tokens (50 vs 10), unlimited plan regeneration, detailed progress summaries, priority support, and an ad-free experience. Check the feature comparison above for full details!
                  </div>
                </div>

                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>🚀 What happens if I run out of tokens?</div>
                  <div className="small">
                    If you use all your tokens, you can still practice with existing generated content and access lessons. Your tokens refresh on the 1st of every month. Premium users can also contact support for additional tokens.
                  </div>
                </div>

                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>🔄 Can I downgrade from Premium to Free?</div>
                  <div className="small">
                    Absolutely! You can downgrade anytime. You'll keep your progress and generated content, and your tokens will reset to 10/month starting the next billing cycle.
                  </div>
                </div>

                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>📱 Do I need to pay for each device?</div>
                  <div className="small">
                    No! Your subscription is tied to your account, not your device. Log in on any browser or device (once we launch mobile apps) and enjoy your Premium benefits everywhere.
                  </div>
                </div>

                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>📧 How do I get support?</div>
                  <div className="small">
                    Free users can reach out via our contact form. Premium users get priority email support with responses within 24 hours. We're also building a community forum and live chat for all users soon!
                  </div>
                </div>

                <div className={styles.faqItem}>
                  <div className={styles.faqQuestion}>🎯 What instruments do you support?</div>
                  <div className="small">
                    Currently, TuneQuest is optimized for Guitar (both Acoustic and Electric). We're actively working on Piano, Violin, and other instruments. Premium users get early access to new instruments!
                  </div>
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
