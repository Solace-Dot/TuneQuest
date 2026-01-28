import React from "react";
import styles from "../styles/components/ChartPlaceholder.module.css";

function ChartPlaceholder({ title }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>{title}</div>
      <div className={styles.grid}>
        {[32, 60, 48, 70, 55, 80].map((height, idx) => (
          <div
            key={idx}
            className={styles.bar}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className={styles.caption}>
        Chart placeholder — wire up to backend metrics.
      </div>
    </div>
  );
}

export default ChartPlaceholder;
