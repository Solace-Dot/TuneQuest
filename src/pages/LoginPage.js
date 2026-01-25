import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./AuthPage.module.css";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError("Unable to login.");
    }
  };

  return (
    <div className="page-shell">
      <div className={styles.authShell}>
        <div className={styles.card}>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>
            Sign in to continue your musical journey
          </p>
          <form className={styles.form} onSubmit={handleSubmit}>
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
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn btn-primary" type="submit">
              Sign In
            </button>
          </form>
          <div className={styles.linkRow}>
            Don't have an account? <Link to="/register">Sign up</Link>
          </div>
          <div className={styles.linkRow}>
            <Link to="/forgot">Forgot your password?</Link>
          </div>
        </div>
        <div className={styles.demoBox}>
          <strong>Demo Credentials</strong>
          <div className="small">Email: demo@example.com</div>
          <div className="small">Password: demo123</div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
