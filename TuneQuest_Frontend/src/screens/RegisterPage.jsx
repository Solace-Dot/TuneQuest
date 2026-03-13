import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { registerSuccess, setError as setAuthError } from "../redux/slices/authSlice";
import { fetchProfileWithToken, registerUser } from "../api/client";
import styles from "../styles/screens/AuthPage.module.css";

function toUsername(name, email) {
  const base = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (base) {
    return base.slice(0, 30);
  }
  return (email.split("@")[0] || "user").slice(0, 30);
}

function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const username = toUsername(form.name, form.email);
      const tokens = await registerUser({
        email: form.email,
        username,
        password: form.password,
      });
      const token = tokens?.access;

      if (!token) {
        throw new Error("No access token returned from registration.");
      }

      const user = await fetchProfileWithToken(token);
      dispatch(registerSuccess({ token, user, subscription: "free" }));
      navigate("/dashboard");
    } catch (err) {
      const firstFieldError =
        Object.values(err?.response?.data || {}).find((value) =>
          Array.isArray(value),
        )?.[0] || "";
      const detail =
        err?.response?.data?.detail || firstFieldError || "Unable to register.";
      setError(detail);
      dispatch(setAuthError(detail));
    }
  };

  return (
    <div className="page-shell">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={4}>
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
                  {error && <div className="alert alert-error">{error}</div>}
                  <button className="btn btn-primary" type="submit">
                    Sign Up
                  </button>
                </form>
                <div className={styles.linkRow}>
                  Already have an account? <Link to="/login">Login</Link>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default RegisterPage;
