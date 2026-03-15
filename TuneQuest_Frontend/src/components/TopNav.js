import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Dropdown } from "react-bootstrap";
import classNames from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { setTheme } from "../redux/slices/themeSlice";
import { setTokens, clearPlan } from "../redux/slices/aiPlanSlice";
import { clearProfile } from "../redux/slices/profileSlice";
import ThemeToggle from "./ThemeToggle";
import api from "../api/client";
import styles from "../styles/components/TopNav.module.css";

function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user, subscription } = useSelector((state) => state.auth);
  const tokensRemaining = useSelector((state) => state.aiPlan.tokensRemaining);
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch token balance on mount
  useEffect(() => {
    if (token) {
      api
        .get("/api/ai/tokens/")
        .then((res) => dispatch(setTokens({
          tokensRemaining: res.data.tokens_remaining,
          tokensLimit: res.data.tokens_limit
        })))
        .catch(() => dispatch(setTokens({ tokensRemaining: 10, tokensLimit: 10 })));
    }
  }, [token, dispatch]);

  const handleLogout = () => {
    const defaultTheme =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";

    dispatch(setTheme(defaultTheme));
    localStorage.removeItem("selectedBg");
    localStorage.removeItem("tunequest_settings");
    localStorage.removeItem("chat_open");
    localStorage.removeItem("chat_widget_pos");
    localStorage.removeItem("tunequest-profile"); // Clear user-specific profile data
    document.documentElement.classList.remove("compact-mode");
    document.documentElement.classList.remove("reduce-motion");
    window.dispatchEvent(new CustomEvent("bgchange", { detail: "none" }));

    // Clear all user-specific Redux state
    dispatch(clearPlan());
    dispatch(clearProfile());
    dispatch(logout());
    
    // Clear sessionStorage (contains song caches, etc.)
    sessionStorage.clear();
    
    navigate("/login");
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const tokenBadgeValue = tokensRemaining === null ? "..." : tokensRemaining;

  const navItems = [
    { to: "/dashboard", label: "Dashboard", auth: true },
    { to: "/plan", label: "Plan Tracker", auth: true },
    { to: "/exercises", label: "Exercises", auth: true },
    { to: "/learn", label: "Lessons", auth: true },
    { to: "/progress", label: "Progress", auth: true, premiumOnly: true },
    { to: "/game", label: "Practice Area", auth: true },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.auth && !token) return false;
    if (item.premiumOnly && subscription !== "premium") return false;
    return true;
  });


  return (
    <header className={styles.bar}>
      <div className={styles.brandArea}>
        <Link to={token ? "/dashboard" : "/"} className={styles.brand}>
          <span className={styles.logo}>♪</span>
          <span>TuneQuest</span>
        </Link>
        <ThemeToggle />

        {/* Desktop Navigation links */}
        <div className={styles.navLinks}>
          {visibleNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={classNames(styles.navLink, {
                  [styles.active]: location.pathname.startsWith(item.to),
                })}
              >
                {item.label}
              </Link>
            ))}
        </div>
      </div>

      <div className={styles.actions}>
        {token ? (
          <>
            {/* AI Tokens Display */}
            <span
              className={classNames(styles.badge, styles.tokensBadge, {
                [styles.tokensBadgeHigh]: tokensRemaining === null || tokensRemaining > 5,
                [styles.tokensBadgeMed]: tokensRemaining > 0 && tokensRemaining <= 5,
                [styles.tokensBadgeLow]: tokensRemaining === 0,
              })}
              title="AI tokens remaining for practice plan generation"
            >
              AI Tokens: {tokenBadgeValue}
            </span>

            {/* Settings Icon */}
            <Link to="/settings" className={styles.settingsBtn} aria-label="Settings" title="General Settings">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>

            {/* User Dropdown */}
            <Dropdown align="end">
              <Dropdown.Toggle as="div" className={styles.userDropdownToggle}>
                <button className={styles.userButton}>
                  <span className={styles.userAvatar}>
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </span>
                  <span className={styles.userName}>{user?.username || "User"}</span>
                  <svg className={styles.dropdownIcon} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  </svg>
                </button>
              </Dropdown.Toggle>

              <Dropdown.Menu className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownUserInfo}>
                    <span className={styles.dropdownAvatar}>
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </span>
                    <div>
                      <div className={styles.dropdownUsername}>{user?.username || "User"}</div>
                      <div className={styles.dropdownEmail}>{user?.email || "user@tunequest.com"}</div>
                    </div>
                  </div>
                  <span
                    className={classNames(
                      styles.badge,
                      styles.dropdownPlanBadge,
                      subscription === "premium" ? styles.badgePremium : styles.badgeFree,
                    )}
                  >
                    {subscription === "premium" ? "Premium Plan" : "Free Plan"}
                  </span>
                  <div className={styles.dropdownTokens}>
                    AI Tokens Left: {tokenBadgeValue}
                  </div>
                </div>
                <Dropdown.Divider />
                <Dropdown.Item as={Link} to="/profile" className={styles.dropdownItem}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  Profile Settings
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/subscribe" className={styles.dropdownItem}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1l2.5 5 5.5.75-4 3.75 1 5.5L8 13l-5 3 1-5.5-4-3.75L5.5 6z"/>
                  </svg>
                  {subscription === "premium" ? "Manage Subscription" : "Upgrade to Premium"}
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className={styles.dropdownItemDanger}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 1h8v2H3v10h8v2H3a2 2 0 01-2-2V3a2 2 0 012-2zm9 4l4 3-4 3V9H6V7h6V5z"/>
                  </svg>
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            {/* Mobile menu toggle */}
            <button className={styles.menuToggle} onClick={toggleMenu}>
              ☰
            </button>
          </>
        ) : (
          <div className={styles.ctaGroup}>
            <Link to="/login" className={styles.navLink}>
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Sign Up
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {token && menuOpen && (
        <div className={styles.mobileMenu}>
          {visibleNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={classNames(styles.mobileNavLink, {
                [styles.active]: location.pathname.startsWith(item.to),
              })}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

export default TopNav;
