import React from "react";
import { Link, useLocation } from "react-router-dom";
import classNames from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import ThemeToggle from "./ThemeToggle";
import styles from "../styles/components/TopNav.module.css";

function TopNav() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { token, user, subscription } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", auth: true },
    { to: "/plan", label: "Practice Plan", auth: true },
    { to: "/exercises", label: "Exercises", auth: true },
    { to: "/progress", label: "Progress", auth: true },
    { to: "/subscribe", label: "Subscription", auth: false },
  ];

  return (
    <header className={styles.bar}>
      <div className={styles.brandArea}>
        <Link to={token ? "/dashboard" : "/"} className={styles.brand}>
          <span className={styles.logo}>♪</span>
          <span>TuneQuest</span>
        </Link>
        <div className={styles.navLinks}>
          {navItems
            .filter((item) => (item.auth ? token : true))
            .map((item) => (
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
        <ThemeToggle />
        {token ? (
          <div className={styles.userArea}>
            <span
              className={classNames(
                styles.badge,
                subscription === "premium"
                  ? styles.badgePremium
                  : styles.badgeFree,
              )}
            >
              {subscription === "premium" ? "Premium" : "Free"}
            </span>
            <span className={styles.userName}>{user?.name || "Musician"}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
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
    </header>
  );
}

export default TopNav;
