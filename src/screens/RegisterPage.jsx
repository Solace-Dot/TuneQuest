import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { registerSuccess, setError as setAuthError } from "../redux/slices/authSlice";
import styles from "../styles/screens/AuthPage.module.css";

function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Simulate registration - replace with actual API call
      const mockToken = "mock-jwt-token-" + Date.now();
      dispatch(registerSuccess({ token: mockToken, user: form, subscription: "free" }));
      navigate("/dashboard");
    } catch (err) {
      setError("Unable to register.");
      dispatch(setAuthError("Unable to register."));
    }
  };

  return (
    <div className="page-shell">
      <div className={styles.authShell}>
        <div className={styles.card}>
          <h2 className={styles.title}>Create Account</h2>
          <p className={styles.subtitle}>
            Join TuneQuest to start your personalized practice.
          </p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Full Name</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Alex Musician"
                required
              />
            </label>
            <label className="form-field">
              <span>Email Address</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="form-field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </label>
            <button className="btn btn-primary" type="submit">
              Sign Up
            </button>
          </form>
          <div className={styles.linkRow}>
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
