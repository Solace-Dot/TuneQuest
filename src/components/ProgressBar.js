import React from "react";
import styles from "../styles/components/ProgressBar.module.css";

function ProgressBar({ value = 0 }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={styles.track}>
      <div className={styles.bar} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default ProgressBar;
