import React from "react";
import styles from "../styles/components/Footer.module.css";

function Footer() {
  return (
    <footer className={styles.footer}>
      <div>© 2026 TuneQuest. All rights reserved.</div>
      <div className={styles.links}>
        <a href="#privacy">Privacy Policy</a>
        <a href="#terms">Terms of Service</a>
      </div>
    </footer>
  );
}

export default Footer;
