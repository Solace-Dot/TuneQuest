import React, { useState } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/screens/AuthPage.module.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="page-shell">
      <div className={styles.authShell}>
        <div className={styles.card}>
          <h2 className={styles.title}>Reset Password</h2>
          <p className={styles.subtitle}>
            Enter your email and we'll send reset instructions.
          </p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Email Address</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            {submitted && (
              <div className="alert alert-success">
                Check your inbox for a reset link.
              </div>
            )}
            <button className="btn btn-primary" type="submit">
              Send Reset Link
            </button>
          </form>
          <div className={styles.linkRow}>
            Remembered your password? <Link to="/login">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
