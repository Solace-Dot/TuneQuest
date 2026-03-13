import React, { useMemo, useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { setProfile } from '../redux/slices/profileSlice';
import { updateProfile } from '../services/api';
import { getReadableTimeUntilRefresh } from '../services/tokenRefresher';
import styles from '../styles/screens/ProfilePage.module.css';

const INSTRUMENT_OPTIONS = ['Guitar', 'Piano', 'Violin', 'Voice'];

const SKILL_OPTIONS = ['Beginner', 'Intermediate'];

const LEARNING_GOAL_OPTIONS = [
  'Performance Mastery',
  'Songwriting & Composition',
  'Boost Music Theory',
];

function ProfilePage() {
  const dispatch = useDispatch();
  const { user, subscription } = useSelector((state) => state.auth);
  const { instrument, skillLevel, goal } = useSelector((state) => state.profile);
  const plan = useSelector((state) => state.aiPlan.plan);
  const tokensRemaining = useSelector((state) => state.aiPlan.tokensRemaining);

  const [form, setForm] = useState({
    instrument: instrument || 'Guitar',
    skillLevel: skillLevel || 'Beginner',
    goal: goal || '',
  });
  const [saveState, setSaveState] = useState('idle'); // idle | saved | error | loading
  const [saveError, setSaveError] = useState('');
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(() => getReadableTimeUntilRefresh());

  // Update time until refresh every minute
  useEffect(() => {
    setTimeUntilRefresh(getReadableTimeUntilRefresh());
    const interval = setInterval(() => {
      setTimeUntilRefresh(getReadableTimeUntilRefresh());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const completedSteps = plan?.completed_steps ?? 0;
  const totalSteps = plan?.total_steps ?? 0;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const profileCompletePct = useMemo(() => {
    const checks = [
      !!form.instrument,
      !!form.skillLevel,
      !!form.goal?.trim(),
      !!user?.username,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form.goal, form.instrument, form.skillLevel, user?.username]);

  const getInitials = (name = 'User') =>
    name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  const onFieldChange = (field, value) => {
    setSaveState('idle');
    setSaveError('');
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSave = async () => {
    setSaveState('loading');
    setSaveError('');
    try {
      await updateProfile({
        instrument: form.instrument,
        skill_level: form.skillLevel,
        learning_goal: form.goal,
      });
      dispatch(
        setProfile({
          instrument: form.instrument,
          skillLevel: form.skillLevel,
          goal: form.goal,
        })
      );
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save profile';
      setSaveError(msg);
      setSaveState('error');
    }
  };

  return (
    <div className="page-shell">
      <Container fluid>
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div>
            <h1 className={styles.title}>Your Profile</h1>
            <p className={styles.subtitle}>Manage your learning setup and account overview</p>
          </div>
          <div className={styles.avatar}>
            {getInitials(user?.username || 'Musician')}
          </div>
        </div>

        {/* Profile Information Grid */}
        <div className={styles.profileGrid}>
          {/* Editable Musical Profile */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Musical Profile</h3>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Instrument</span>
                <select
                  className={styles.inputControl}
                  value={form.instrument}
                  onChange={(e) => onFieldChange('instrument', e.target.value)}
                >
                  {INSTRUMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Skill Level</span>
                <select
                  className={styles.inputControl}
                  value={form.skillLevel}
                  onChange={(e) => onFieldChange('skillLevel', e.target.value)}
                >
                  {SKILL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Learning Goal</span>
                <select
                  className={styles.inputControl}
                  value={form.goal}
                  onChange={(e) => onFieldChange('goal', e.target.value)}
                >
                  <option value="">Select a goal...</option>
                  {LEARNING_GOAL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {saveError && (
                <div style={{
                  color: 'var(--danger)',
                  fontSize: 13,
                  padding: '8px 12px',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  borderRadius: 6,
                  border: '1px solid rgba(220, 38, 38, 0.3)'
                }}>
                  {saveError}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button 
                  className="btn btn-primary" 
                  onClick={onSave}
                  disabled={saveState === 'loading'}
                  style={{ opacity: saveState === 'loading' ? 0.7 : 1, cursor: saveState === 'loading' ? 'not-allowed' : 'pointer' }}
                >
                  {saveState === 'loading' ? 'Saving...' : 'Save Profile'}
                </button>
                {saveState === 'saved' && (
                  <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 700 }}>✓ Saved</span>
                )}
              </div>
            </div>
          </div>

          {/* Account Snapshot */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Account Snapshot</h3>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.stat}>
                <div className={styles.statValue} style={{ textTransform: 'capitalize' }}>
                  {subscription || 'free'}
                </div>
                <div className={styles.statLabel}>Subscription</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{tokensRemaining ?? 0}</div>
                <div className={styles.statLabel}>AI Tokens</div>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="small">Profile Completion</span>
                <span className="small">{profileCompletePct}%</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${profileCompletePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Token Refresh Status */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Token Refresh</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div className="small" style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Next Auto-Refresh
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {timeUntilRefresh}
                </div>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: '6px' }}>
                <span className="small" style={{ color: 'var(--success)' }}>
                  ✓ Tokens refresh automatically at midnight PT daily
                </span>
              </div>
            </div>
          </div>

          {/* Plan Progress */}
          <div className={`${styles.infoCard} ${styles.streakCard}`}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Today&apos;s Plan Progress</h3>
            </div>
            <div className={styles.streakNumber}>{progressPct}%</div>
            <p className={styles.streakText}>
              {totalSteps > 0
                ? `${completedSteps}/${totalSteps} steps completed`
                : 'No plan generated yet'}
            </p>
          </div>

          {/* Skill Summary */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Skill Summary</h3>
            </div>
            <div className={styles.achievementsList}>
              <div className={styles.achievement}>
                <span className={styles.achievementText}>Instrument: {form.instrument}</span>
              </div>
              <div className={styles.achievement}>
                <span className={styles.achievementText}>Level: {form.skillLevel}</span>
              </div>
              <div className={styles.achievement}>
                <span className={styles.achievementText}>Goal: {form.goal || 'Set your learning goal'}</span>
              </div>
              <div className={styles.achievement}>
                <span className={styles.achievementText}>AI tokens remaining: {tokensRemaining ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Learning Snapshot */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Learning Snapshot</h3>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Plan Steps</span>
                <span className={styles.metaValue}>{totalSteps}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Completed Today</span>
                <span className={styles.metaValue}>{completedSteps}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Completion</span>
                <span className={styles.metaValue}>{progressPct}%</span>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Account Details</h3>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Username</span>
                <span className={styles.metaValue}>{user?.username || 'Musician'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Subscription</span>
                <span className={`${styles.metaValue} ${styles.pill}`} style={{ textTransform: 'capitalize' }}>
                  {subscription || 'free'}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Goal Status</span>
                <span className={styles.metaValue}>{form.goal?.trim() ? 'Configured' : 'Needs setup'}</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default ProfilePage;