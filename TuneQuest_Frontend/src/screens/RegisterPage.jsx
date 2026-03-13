import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { registerSuccess, setError as setAuthError } from "../redux/slices/authSlice";
import styles from "../styles/screens/AuthPage.module.css";
import { registerUser } from "../services/api";

function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  try {
    const response = await registerUser({ username: form.username, email: form.email, password: form.password });
    const { access, refresh } = response.data;
    localStorage.setItem("tunequest-auth", JSON.stringify({ token: access, refresh }));
    dispatch(registerSuccess({ token: access, refresh, user: { username: form.username, email: form.email }, subscription: "free" }));
    navigate("/dashboard");
  } catch (err) {
    const data = err.response?.data;
    if (data?.email) {
      setError(data.email[0]);
    } else if (data?.username) {
      setError(data.username[0]);
    } else {
      setError(data?.detail || "Unable to register.");
    }
    dispatch(setAuthError("Unable to register."));
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
                    <span>Username</span>
                    <input
                      className="input"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="alexmusician"
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
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default RegisterPage;
