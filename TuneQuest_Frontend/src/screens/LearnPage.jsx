import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../api/client";
import { Container, Row, Col } from "react-bootstrap";
import styles from "../styles/screens/LearnPage.module.css";

// ─── Lesson categories ────────────────────────────────────────
const CATEGORIES = ["All", "Music Theory", "Scales", "Chords", "Rhythm", "Ear Training"];

const CATEGORY_ICONS = {
  "Music Theory": "📖",
  Scales: "🎼",
  Chords: "🎸",
  Rhythm: "🥁",
  "Ear Training": "👂",
};

const DIFFICULTY_CONFIG = {
  Beginner: { color: "var(--accent)", bg: "rgba(95,224,192,0.12)" },
  Intermediate: { color: "var(--primary-soft)", bg: "rgba(129,92,249,0.12)" },
  Advanced: { color: "var(--danger)", bg: "rgba(255,101,132,0.12)" },
};

function renderBlock(block, idx) {
  switch (block.type) {
    case "text":
      return (
        <div key={idx} className={styles.block}>
          {block.heading && <h4 className={styles.blockHeading}>{block.heading}</h4>}
          <p className={styles.blockText}>{block.body}</p>
        </div>
      );

    case "tip":
      return (
        <div key={idx} className={styles.tipBlock}>
          <p className={styles.tipText}>{block.body}</p>
        </div>
      );

    case "note_grid":
      return (
        <div key={idx} className={styles.block}>
          {block.heading && <h4 className={styles.blockHeading}>{block.heading}</h4>}
          <div className={styles.noteGrid}>
            {block.notes.map((n, i) => (
              <div key={i} className={`${styles.noteChip} ${block.highlight ? styles.noteChipHighlight : ""}`}>
                {n}
              </div>
            ))}
          </div>
        </div>
      );

    case "formula":
      return (
        <div key={idx} className={styles.block}>
          {block.heading && <h4 className={styles.blockHeading}>{block.heading}</h4>}
          <div className={styles.formulaRow}>
            {block.steps.map((step, i) => (
              <React.Fragment key={i}>
                <div className={styles.formulaLabel}>{block.labels[i]}</div>
                <div className={`${styles.formulaStep} ${step === "H" || parseInt(step) <= 2 ? styles.halfStep : styles.wholeStep}`}>
                  {step}
                </div>
              </React.Fragment>
            ))}
            {block.labels[block.labels.length - 1] && (
              <div className={styles.formulaLabel}>{block.labels[block.labels.length - 1]}</div>
            )}
          </div>
        </div>
      );

    case "chord_grid":
      return (
        <div key={idx} className={styles.block}>
          {block.heading && <h4 className={styles.blockHeading}>{block.heading}</h4>}
          <div className={styles.chordGrid}>
            {block.chords.map((chord, i) => (
              <div key={i} className={styles.chordCard}>
                <div className={styles.chordName}>{chord.name}</div>
                <div className={styles.chordFormula}>{chord.formula}</div>
                <div className={styles.chordExample}>{chord.example}</div>
                <div className={styles.chordMood}>{chord.mood}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "chord_progression":
      return (
        <div key={idx} className={styles.block}>
          {block.heading && <h4 className={styles.blockHeading}>{block.heading}</h4>}
          <div className={styles.progressionRow}>
            {block.chords.map((chord, i) => (
              <React.Fragment key={i}>
                <div className={styles.progressionChord}>
                  <div className={styles.progressionNumeral}>{chord.numeral}</div>
                  <div className={styles.progressionName}>{chord.name}</div>
                  <div className={styles.progressionNotes}>{chord.notes}</div>
                </div>
                {i < block.chords.length - 1 && <div className={styles.progressionArrow}>→</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      );

    case "rhythm_table":
    case "time_sig_table":
    case "interval_table":
      return (
        <div key={idx} className={styles.block}>
          {block.heading && <h4 className={styles.blockHeading}>{block.heading}</h4>}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((cell, j) => (
                      <td key={j} className={j === 0 ? styles.tableCellAccent : styles.tableCell}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "interval_songs":
      return (
        <div key={idx} className={styles.block}>
          {block.heading && <h4 className={styles.blockHeading}>{block.heading}</h4>}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.tableHead}>Interval</th>
                  <th className={styles.tableHead}>Remember it as…</th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i}>
                    <td className={styles.tableCellAccent}>{row.interval}</td>
                    <td className={styles.tableCell}>{row.song}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ─ Component ────────────────────────────────────────────
function LearnPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [openLesson, setOpenLesson] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const recommendedSlugs = useSelector((state) => state.aiPlan.recommendedLessonSlugs);
  const hasRecommendations = recommendedSlugs.length > 0;

  useEffect(() => {
    api
      .get("/api/learn/lessons/")
      .then((res) => setLessons(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const completedIds = new Set(
    lessons.filter((l) => l.is_completed).map((l) => l.slug)
  );

  const filtered =
    activeCategory === "All"
      ? lessons
      : lessons.filter((l) => l.category === activeCategory);

  async function handleMarkDone(lesson) {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await api.post(`/api/learn/lessons/${lesson.slug}/toggle/`);
      setLessons((prev) =>
        prev.map((l) =>
          l.slug === lesson.slug ? { ...l, is_completed: res.data.is_completed } : l
        )
      );
      setOpenLesson((prev) =>
        prev && prev.slug === lesson.slug
          ? { ...prev, is_completed: res.data.is_completed }
          : prev
      );
    } catch {
      // toggle failed silently
    } finally {
      setToggling(false);
    }
  }

  const totalCompleted = completedIds.size;
  const totalLessons = lessons.length;

  return (
    <div className="page-shell">
      <Container fluid>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Learn</h2>
            <p className={styles.pageSubtitle}>
              Bite-sized music theory lessons — from basics to intermediate concepts.
            </p>
          </div>
          <div className={styles.progressPill}>
            <span className={styles.progressCount}>{totalCompleted}/{totalLessons}</span>
            <span className={styles.progressLabel}>lessons done</span>
            <div className={styles.miniBar}>
              <div
                className={styles.miniBarFill}
                style={{ width: `${(totalCompleted / totalLessons) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recommended for Your Practice Plan */}
        {!loading && hasRecommendations && (
          <div className={styles.recommendedSection}>
            <div className={styles.recommendedHeader}>
              <span className={styles.recommendedIcon}>✨</span>
              <div>
                <div className={styles.recommendedTitle}>Recommended for Your Practice Plan</div>
                <div className={styles.recommendedSubtitle}>
                  Master these lessons to get the most out of your current plan
                </div>
              </div>
            </div>
            <div className={styles.recommendedScroll}>
              {lessons
                .filter((l) => recommendedSlugs.includes(l.slug))
                .map((lesson) => {
                  const isDone = completedIds.has(lesson.slug);
                  const diff = DIFFICULTY_CONFIG[lesson.difficulty] || {};
                  return (
                    <div
                      key={lesson.slug}
                      className={`${styles.recommendedCard} ${isDone ? styles.recommendedCardDone : ""}`}
                      onClick={() => setOpenLesson(lesson)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setOpenLesson(lesson)}
                    >
                      <div className={styles.recommendedCardTop}>
                        <span>{CATEGORY_ICONS[lesson.category] || "📘"}</span>
                        {isDone && <span className={styles.doneCheck}>✓</span>}
                      </div>
                      <div className={styles.recommendedCardTitle}>{lesson.title}</div>
                      <div className={styles.recommendedCardMeta}>
                        <span className={styles.diffBadge} style={{ color: diff.color, background: diff.bg }}>
                          {lesson.difficulty}
                        </span>
                        <span className={styles.durationBadge}>⏱ {lesson.duration_minutes} min</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className={styles.tabRow}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.tab} ${activeCategory === cat ? styles.tabActive : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_ICONS[cat] && <span>{CATEGORY_ICONS[cat]} </span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Lesson Grid */}
        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⏳</div>
            <div>Loading lessons…</div>
          </div>
        ) : (
        <Row className="g-4">
          {filtered.map((lesson) => {
            const isDone = completedIds.has(lesson.slug);
            const diff = DIFFICULTY_CONFIG[lesson.difficulty] || {};
            return (
              <Col key={lesson.slug} lg={4} md={6} xs={12}>
                <div
                  className={`card ${styles.lessonCard} ${isDone ? styles.lessonCardDone : ""}`}
                  onClick={() => setOpenLesson(lesson)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setOpenLesson(lesson)}
                >
                  {/* Card top row */}
                  <div className={styles.cardTop}>
                    <span className={styles.categoryIcon}>{CATEGORY_ICONS[lesson.category] || "📘"}</span>
                    {isDone && <span className={styles.doneCheck}>✓ Done</span>}
                  </div>

                  {/* Title */}
                  <h3 className={styles.lessonTitle}>{lesson.title}</h3>
                  <p className={styles.lessonDesc}>{lesson.description}</p>

                  {/* Meta row */}
                  <div className={styles.lessonMeta}>
                    <span
                      className={styles.diffBadge}
                      style={{ color: diff.color, background: diff.bg }}
                    >
                      {lesson.difficulty}
                    </span>
                    <span className={styles.durationBadge}>⏱ {lesson.duration_minutes} min</span>
                    <span className={styles.categoryBadge}>{lesson.category}</span>
                  </div>

                  <div className={styles.openHint}>Open lesson →</div>
                </div>
              </Col>
            );
          })}
          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📭</div>
              <div>No lessons in this category yet.</div>
            </div>
          )}
        </Row>
        )}
      </Container>

      {/* Lesson Modal */}
      {openLesson && (
        <div
          className={styles.modalOverlay}
          onClick={() => setOpenLesson(null)}
          role="dialog"
          aria-modal="true"
          aria-label={openLesson.title}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalCat}>
                  {CATEGORY_ICONS[openLesson.category]} {openLesson.category}
                </div>
                <h2 className={styles.modalTitle}>{openLesson.title}</h2>
                <div className={styles.modalMeta}>
                  <span
                    className={styles.diffBadge}
                    style={{
                      color: (DIFFICULTY_CONFIG[openLesson.difficulty] || {}).color,
                      background: (DIFFICULTY_CONFIG[openLesson.difficulty] || {}).bg,
                    }}
                  >
                    {openLesson.difficulty}
                  </span>
                  <span className={styles.durationBadge}>⏱ {openLesson.duration_minutes} min</span>
                </div>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setOpenLesson(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Lesson body */}
            <div className={styles.modalBody}>
              {openLesson.content.map((block, i) => renderBlock(block, i))}
            </div>

            {/* Modal footer */}
            <div className={styles.modalFooter}>
              <button
                className={`btn ${completedIds.has(openLesson.slug) ? "btn-outline" : "btn-primary"}`}
                onClick={() => handleMarkDone(openLesson)}
                disabled={toggling}
              >
                {completedIds.has(openLesson.slug) ? "↩ Mark as Incomplete" : "✓ Mark as Complete"}
              </button>
              <button className="btn btn-outline" onClick={() => setOpenLesson(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LearnPage;
