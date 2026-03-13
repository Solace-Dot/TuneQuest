import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { deleteAccount } from '../services/api';
import { logout } from '../redux/slices/authSlice';
import { clearPlan } from '../redux/slices/aiPlanSlice';
import { clearProfile } from '../redux/slices/profileSlice';
import { BACKGROUND_OPTIONS } from '../backgrounds/BackgroundManager';
import styles from '../styles/screens/SettingsPage.module.css';

const DEFAULTS = {
  // Appearance
  background: 'none',
  // Notifications
  browserNotifications: false,
  practiceReminders: true,
  reminderTime: '18:00',
  // Practice
  defaultSessionLength: 30,
  metronomeOnByDefault: false,
  autoPlaySounds: true,
  // Privacy
  publicProfile: false,
  shareProgress: false,
};

const load = () => {
  try {
    const saved = localStorage.getItem('tunequest_settings');
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
};

const save = (settings) => {
  localStorage.setItem('tunequest_settings', JSON.stringify(settings));
};

// Apply background — saves to localStorage and fires a custom event so App.js reacts immediately
const applyBackground = (id) => {
  localStorage.setItem('selectedBg', id || 'none');
  // Defer dispatch so it never fires during a React render cycle
  setTimeout(() => window.dispatchEvent(new CustomEvent('bgchange', { detail: id || 'none' })), 0);
};

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

function BackgroundPicker({ value, onChange }) {
  const theme = useSelector((state) => state.theme.mode);
  return (
    <div className={styles.bgPickerWrap}>
      <span className={styles.rowTitle}>Animated Background</span>
      <span className={styles.rowDesc}>Choose a live animated background effect</span>
      <div className={styles.bgGrid}>
        {BACKGROUND_OPTIONS.map(opt => {
          const isSelected = value === opt.id;
          const swatchColor = theme === 'light' ? opt.lightColor : opt.darkColor;
          return (
            <motion.button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`${styles.bgOption} ${isSelected ? styles.bgOptionSelected : ''}`}
              whileHover={{ scale: 1.06, y: -3 }}
              whileTap={{ scale: 0.95 }}
              title={opt.description}
            >
              <div
                className={styles.bgPreview}
                style={{ background: swatchColor }}
              >
                <span className={styles.bgPreviewIcon}>{opt.icon}</span>
                {isSelected && (
                  <motion.div
                    className={styles.bgCheckmark}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260 }}
                  >
                    ✓
                  </motion.div>
                )}
              </div>
              <span className={styles.bgLabel}>{opt.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, description, children }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>
        <span className={styles.rowTitle}>{label}</span>
        {description && <span className={styles.rowDesc}>{description}</span>}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [settings, setSettings] = useState(load);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Apply side-effects on load — settings are managed separately via update() handler
  // Apply background on load
  useEffect(() => {
    applyBackground(settings.background);
  }, [settings.background]);

  const update = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      save(next);
      // Immediately apply appearance changes
      if (key === 'background') applyBackground(value);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleNotificationToggle = async (val) => {
    if (val && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }
    update('browserNotifications', val);
  };

  const resetAll = () => {
    save(DEFAULTS);
    setSettings({ ...DEFAULTS });
    applyBackground(DEFAULTS.background);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    
    try {
      await deleteAccount();
      
      // Clear all user data
      localStorage.removeItem("tunequest-profile");
      localStorage.removeItem("tunequest-auth");
      sessionStorage.clear();
      
      // Clear Redux state
      dispatch(clearPlan());
      dispatch(clearProfile());
      dispatch(logout());
      
      // Redirect to landing page
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to delete account. Please try again.";
      setDeleteError(msg);
      setDeleteLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Container fluid>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>General Settings</h1>
            <p className={styles.subtitle}>Customize your TuneQuest experience</p>
          </div>
          {saved && (
            <span className={styles.savedBadge}>✓ Saved</span>
          )}
        </div>

        <div className={styles.grid}>

          {/* ── Appearance ── */}
          <Section icon="🎨" title="Appearance">
            <Row label="Theme">
              <span className={styles.rowDesc} style={{ textAlign: 'right' }}>
                Managed by the <strong>☀/🌙</strong> toggle in the nav bar
              </span>
            </Row>
            <BackgroundPicker value={settings.background} onChange={v => update('background', v)} />
          </Section>

          {/* ── Notifications ── */}
          <Section icon="🔔" title="Notifications">
            <Row label="Browser Notifications" description="Allow TuneQuest to send desktop alerts">
              <Toggle checked={settings.browserNotifications} onChange={handleNotificationToggle} />
            </Row>
            <Row label="Practice Reminders" description="Daily reminder to keep your streak alive">
              <Toggle checked={settings.practiceReminders} onChange={v => update('practiceReminders', v)} />
            </Row>
            {settings.practiceReminders && (
              <Row label="Reminder Time">
                <input
                  type="time"
                  value={settings.reminderTime}
                  onChange={e => update('reminderTime', e.target.value)}
                  className={styles.timeInput}
                />
              </Row>
            )}
          </Section>

          {/* ── Practice Defaults ── */}
          <Section icon="🎸" title="Practice Defaults">
            <Row label="Default Session Length" description="Minutes pre-filled when creating a session">
              <div className={styles.selectWrap}>
                <select
                  value={settings.defaultSessionLength}
                  onChange={e => update('defaultSessionLength', Number(e.target.value))}
                  className={styles.select}
                >
                  {[15, 30, 45, 60, 90].map(m => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
            </Row>
            <Row label="Metronome On by Default" description="Start practice sessions with metronome enabled">
              <Toggle checked={settings.metronomeOnByDefault} onChange={v => update('metronomeOnByDefault', v)} />
            </Row>
            <Row label="Auto-play Sounds" description="Play note sounds automatically in the game">
              <Toggle checked={settings.autoPlaySounds} onChange={v => update('autoPlaySounds', v)} />
            </Row>
          </Section>

          {/* ── Privacy ── */}
          <Section icon="🔒" title="Privacy">
            <Row label="Public Profile" description="Allow others to see your profile and stats">
              <Toggle checked={settings.publicProfile} onChange={v => update('publicProfile', v)} />
            </Row>
            <Row label="Share Progress" description="Let TuneQuest use your data to improve recommendations">
              <Toggle checked={settings.shareProgress} onChange={v => update('shareProgress', v)} />
            </Row>
          </Section>

          {/* ── Account ── */}
          <Section icon="👤" title="Account">
            <Row label="Profile Settings" description="Update your username, instrument, and goals">
              <Link to="/profile" className={styles.linkBtn}>Go to Profile →</Link>
            </Row>
            <Row label="Subscription" description="Manage your plan or upgrade to Premium">
              <Link to="/subscribe" className={styles.linkBtn}>Manage Plan →</Link>
            </Row>
            <Row label="Export Your Data" description="Download all your progress, scores, and preferences">
              <button className={styles.linkBtn}>Export as JSON</button>
            </Row>
          </Section>

          {/* ── Danger Zone ── */}
          <Section icon="⚠️" title="Danger Zone">
            <Row label="Reset All Settings" description="Restore all settings to their default values">
              <button onClick={resetAll} className={styles.resetBtn}>Reset to Defaults</button>
            </Row>
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <div style={{ marginBottom: '12px' }}>
                <span className={styles.rowTitle}>Delete Account</span>
                <span className={styles.rowDesc} style={{ display: 'block', marginTop: '2px' }}>
                  Permanently delete your account and all data
                </span>
              </div>
              {deleteError && (
                <div style={{ 
                  color: 'var(--danger)',
                  fontSize: '0.9em', 
                  marginBottom: '10px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  borderRadius: '6px',
                  border: '1px solid rgba(220, 38, 38, 0.3)'
                }}>
                  {deleteError}
                </div>
              )}
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className={styles.deleteBtn}
                >
                  {deleteLoading ? 'Deleting...' : deleteConfirm ? 'Confirm Delete' : 'Delete Account'}
                </button>
                {deleteConfirm && (
                  <span className={styles.rowDesc} style={{ fontSize: '0.85em', whiteSpace: 'nowrap' }}>
                    Click again to confirm
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* ── App Info ── */}
          <Section icon="ℹ️" title="About TuneQuest">
            <Row label="Version">
              <span className="small">v2.0.1 (March 2026)</span>
            </Row>
            <Row label="Contact Support">
              <a href="mailto:support@tunequest.app" className={styles.linkBtn}>support@tunequest.app</a>
            </Row>
            <Row label="Help & Documentation">
              <button className={styles.linkBtn} onClick={() => window.open('https://docs.tunequest.app', '_blank')}>View Docs →</button>
            </Row>
            <Row label="Report a Bug">
              <button className={styles.linkBtn} onClick={() => window.open('https://feedback.tunequest.app', '_blank')}>Send Feedback →</button>
            </Row>
            <Row label="Privacy Policy">
              <button className={styles.linkBtn} onClick={() => window.open('https://tunequest.app/privacy', '_blank')}>Read Policy →</button>
            </Row>
          </Section>

        </div>
      </Container>
    </div>
  );
}

export default SettingsPage;
