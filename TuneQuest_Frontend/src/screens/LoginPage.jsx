import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { loginSuccess, setError as setAuthError } from "../redux/slices/authSlice";
import { setInstrument, setSkillLevel } from "../redux/slices/profileSlice";
import { fetchProfileWithToken, loginUser } from "../api/client";
import styles from "../styles/screens/AuthPage.module.css";

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const tokens = await loginUser({
        email: form.email,
        password: form.password,
      });
      const token = tokens?.access;

      if (!token) {
        throw new Error("No access token returned from login.");
      }

      const user = await fetchProfileWithToken(token);
      dispatch(loginSuccess({ token, user, subscription: "free" }));
      
      // Restore profile data from the user object
      if (user?.profile) {
        if (user.profile.instrument_name) {
          dispatch(setInstrument(user.profile.instrument_name));
        }
        if (user.profile.skill_level) {
          dispatch(setSkillLevel(user.profile.skill_level));
        }
      }
      
      navigate("/dashboard");
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        "Unable to login.";
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
                <strong>Backend Auth Enabled</strong>
                <div className="small">Use your registered account credentials.</div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default LoginPage;
