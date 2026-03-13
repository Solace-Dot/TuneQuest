import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { loginSuccess, setError as setAuthError } from "../redux/slices/authSlice";
import styles from "../styles/screens/AuthPage.module.css";
import { loginUser, getProfile } from "../services/api";

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (error) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setShowToast(false);
  setIsLoading(true);
  try {
    const response = await loginUser({ email: form.email, password: form.password });
    const { access, refresh } = response.data;
    
    localStorage.setItem("tunequest-auth", JSON.stringify({ token: access, refresh }));
    
    // fetch real user data from backend
    const profileResponse = await getProfile();
    const user = profileResponse.data;
    
    dispatch(loginSuccess({ token: access, refresh, user, subscription: "free" }));
    navigate("/dashboard");
  } catch (err) {
    const msg = err.response?.data?.detail || err.response?.data?.error || "Unable to login. Please try again.";
    setError(msg);
    dispatch(setAuthError(msg));
    setIsLoading(false);
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
                  <button 
                    className="btn btn-primary" 
                    type="submit"
                    disabled={isLoading}
                    style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
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
                <div className="small">Email: test@example.com</div>
                <div className="small">Password: testpass123</div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
      
      {/* Error Toast Notification */}
      {showToast && error && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#dc2626',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
          zIndex: 9999,
          maxWidth: '400px',
          animation: 'slideUp 0.3s ease',
          fontWeight: 500,
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default LoginPage;
