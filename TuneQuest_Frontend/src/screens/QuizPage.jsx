import React, { useState, useEffect } from "react";
import { Container } from "react-bootstrap";
import { useParams, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { requestQuizGeneration, generateQuizFromFunctionCall, fetchAIQuizzes, completePracticeSession, deleteAIQuiz } from "../api/client";
import { storeQuizzes, updatePracticeStepProgress, removeQuiz } from "../redux/slices/aiPlanSlice";
import QuizWidget from "../components/QuizWidget";
import styles from "../styles/screens/ExercisesPage.module.css";

const QUIZ_CATEGORIES = [
  "Ear Training",
  "Music Theory",
  "Sight Reading",
  "Chord Knowledge",
  "Rhythm",
  "Composer Knowledge",
];

const CATEGORY_ICONS = {
  "Ear Training": "👂",
  "Music Theory": "📚",
  "Sight Reading": "📖",
  "Chord Knowledge": "♪",
  "Rhythm": "🥁",
  "Composer Knowledge": "👨‍🎓",
};

const STATUS_CONFIG = {
  "Not Started": {
    label: "Not Started",
    color: "var(--muted)",
    bg: "rgba(169,172,198,0.12)",
  },
  "In Progress": {
    label: "In Progress",
    color: "var(--primary-soft)",
    bg: "rgba(129,92,249,0.14)",
  },
  Completed: {
    label: "Completed",
    color: "var(--success)",
    bg: "rgba(99,230,190,0.14)",
  },
};

const SKILL_BADGE_STYLE = {
  Beginner: { color: "var(--accent)", bg: "rgba(95,224,192,0.12)" },
  Intermediate: { color: "var(--primary-soft)", bg: "rgba(129,92,249,0.12)" },
  Advanced: { color: "var(--danger)", bg: "rgba(255,101,132,0.12)" },
};

function QuizPage() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { quizId } = useParams();
  const { skillLevel } = useSelector((state) => state.profile);
  const aiQuizzes = useSelector((state) => state.aiPlan.quizzes);

  const [activeTab, setActiveTab] = useState("All");
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executingQuizId, setExecutingQuizId] = useState(location.state?.autoStartQuizId || quizId || null);
  const [generatedQuiz, setGeneratedQuiz] = useState(location.state?.preloadedQuiz || null);
  const practiceStepId = location.state?.practiceStepId || null;

  useEffect(() => {
    if (location.state?.autoStartQuizId) {
      setExecutingQuizId(location.state.autoStartQuizId);
    }
    if (location.state?.preloadedQuiz) {
      setGeneratedQuiz(location.state.preloadedQuiz);
    }
  }, [location.state]);

  // Load AI quizzes from DB on mount
  useEffect(() => {
    const loadSavedQuizzes = async () => {
      try {
        const result = await fetchAIQuizzes();
        if (result.quizzes && result.quizzes.length > 0) {
          setQuizzes(result.quizzes);
          dispatch(storeQuizzes(result.quizzes));
        }
      } catch (err) {
        // Fallback to Redux cache if API unavailable
        if (aiQuizzes.length > 0) {
          setQuizzes(aiQuizzes);
        }
      }
    };
    loadSavedQuizzes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs = ["All", ...QUIZ_CATEGORIES];
  const filtered =
    activeTab === "All"
      ? quizzes
      : quizzes.filter((q) => q.category === activeTab);

  const completedCount = quizzes.filter((q) => q.status === "Completed").length;
  const globalSkillLevel = skillLevel || "Beginner";

  const handleAIRequest = async () => {
    if (!userInput.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await requestQuizGeneration(userInput);

      if (response.function_call) {
        const quizData = await generateQuizFromFunctionCall(response.function_call);

        // quizData now includes the DB id from the backend
        const newQuiz = {
          id: `ai-quiz-${quizData.id}`,
          db_id: quizData.id,
          title: quizData.title,
          category: quizData.category,
          status: quizData.status || 'Not Started',
          skill_level: quizData.skill_level,
          best_score: quizData.best_score ?? null,
          accuracy: quizData.accuracy ?? null,
          avg_completion_time: quizData.avg_completion_time ?? null,
          question_count: quizData.questions?.length || 5,
          lore_description: quizData.lore_description,
          questions: quizData.questions,
          isAIGenerated: true,
          createdAt: quizData.created_at,
        };

        // Update local state and Redux cache
        setQuizzes((prev) => [newQuiz, ...prev.filter((q) => q.id !== newQuiz.id)]);
        dispatch(storeQuizzes([newQuiz, ...aiQuizzes]));
        
        // Start the quiz immediately
        setGeneratedQuiz(quizData);
        setExecutingQuizId(newQuiz.id);
        setUserInput("");
      } else {
        setError("No quiz request detected. Try: 'Give me a quiz on music theory'");
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const handleStartQuiz = (quiz) => {
    setSelectedQuiz(null);
    setExecutingQuizId(quiz.id);
  };

  const handleQuizExit = () => {
    setExecutingQuizId(null);
    setGeneratedQuiz(null);
  };

  const handleDeleteQuiz = async (quiz) => {
    try {
      // Delete from backend database
      const dbId = quiz.db_id || (typeof quiz.id === 'string' && quiz.id.startsWith('ai-quiz-')
        ? quiz.id.replace('ai-quiz-', '')
        : quiz.id);
      
      if (dbId) {
        await deleteAIQuiz(dbId);
      }
      
      // Remove from local state
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      // Remove from Redux store
      dispatch(removeQuiz(quiz.id));
      // Close the modal
      setSelectedQuiz(null);
    } catch (err) {
      alert('Failed to delete quiz: ' + err.message);
    }
  };

  const handleQuizComplete = async (stats) => {
    const activeQuiz = generatedQuiz || quizzes.find((q) => q.id === executingQuizId);
    if (!activeQuiz || !stats) {
      handleQuizExit();
      return;
    }

    const dbId = activeQuiz.db_id || (typeof activeQuiz.id === 'string' && activeQuiz.id.startsWith('ai-quiz-')
      ? activeQuiz.id.replace('ai-quiz-', '')
      : activeQuiz.id);

    const payload = {
      quiz_db_id: dbId,
      score: stats.score,
      accuracy: stats.accuracy,
      avg_completion_time: stats.avg_completion_time,
    };
    if (practiceStepId) payload.step_id = practiceStepId;

    try {
      await completePracticeSession(payload);
    } catch {
      // Keep local state updated even if API persistence fails temporarily.
    }

    const merged = {
      ...activeQuiz,
      status: 'Completed',
      best_score: activeQuiz.best_score == null ? stats.score : Math.max(activeQuiz.best_score, stats.score),
      accuracy: stats.accuracy,
      avg_completion_time:
        activeQuiz.avg_completion_time == null
          ? stats.avg_completion_time
          : (activeQuiz.avg_completion_time + stats.avg_completion_time) / 2,
    };

    const nextQuizzes = [
      merged,
      ...quizzes.filter((q) => (q.id !== activeQuiz.id && q.db_id !== activeQuiz.db_id)),
    ];
    setQuizzes(nextQuizzes);
    dispatch(storeQuizzes(nextQuizzes));

    if (practiceStepId) {
      dispatch(updatePracticeStepProgress({
        stepId: practiceStepId,
        status: 'Completed',
        best_score: stats.score,
        accuracy: stats.accuracy,
        avg_completion_time: stats.avg_completion_time,
      }));
    }

    handleQuizExit();
  };

  // If a quiz is being executed, show QuizWidget
  if (executingQuizId && (generatedQuiz || quizzes.find(q => q.id === executingQuizId))) {
    const activeQuiz = generatedQuiz || quizzes.find(q => q.id === executingQuizId);
    return (
      <div className="page-shell">
        <Container>
          <button
            onClick={handleQuizExit}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            ← Back to Quizzes
          </button>
          <div className="card">
            <QuizWidget
              quiz={activeQuiz}
              onComplete={handleQuizComplete}
            />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Container fluid>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className="section-title">Quiz Generator</h2>
            <p className="subtext">
              Generate custom quizzes with AI or challenge yourself with preset quizzes
            </p>
          </div>
          <div className={styles.skillBadge}>
            <span className={styles.skillDot} />
            {globalSkillLevel}
          </div>
        </div>

        {/* AI Quiz Generation Form */}
        <div className={`card ${styles.tierBar}`}>
          <div style={{ padding: "16px 0" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>
              ✨ Generate Custom Quiz with AI
            </div>
            <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
              <textarea
                className="form-control"
                placeholder="Ask for a quiz (e.g., 'Give me 10 hard questions on music theory' or 'Quiz me on jazz chords')"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                rows="2"
                disabled={loading}
              />
              {error && (
                <div style={{ color: "#f87171", fontSize: "12px" }}>
                  ⚠️ {error}
                </div>
              )}
              <button
                className="btn btn-primary"
                onClick={handleAIRequest}
                disabled={!userInput.trim() || loading}
              >
                {loading ? "Generating... 🎵" : "Generate Quiz 🚀"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className={`card ${styles.tierBar}`}>
          <div className={styles.tierBarInner}>
            <div>
              <div className={styles.tierLabel}>Quizzes Completed</div>
              <div className={styles.tierCount}>
                {completedCount}/{quizzes.length}
              </div>
            </div>
            <div className={styles.tierSlots}>
              {Array.from({ length: Math.min(5, quizzes.length) }).map((_, i) => (
                <div
                  key={i}
                  className={styles.slot}
                  data-filled={i < completedCount ? "true" : "false"}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className={styles.tabNav}>
          {tabs.map((tab) => (
            <button
              key={tab}
              className={styles.tab}
              data-active={activeTab === tab ? "true" : "false"}
              onClick={() => setActiveTab(tab)}
            >
              {tab !== "All" && <span>{CATEGORY_ICONS[tab]}</span>}
              {tab}
            </button>
          ))}
        </div>

        {/* Quiz Card Grid */}
        <div className={styles.cardGrid}>
          {filtered.map((quiz) => {
            const statusCfg =
              STATUS_CONFIG[quiz.status] || {
                color: "var(--muted)",
                bg: "rgba(169,172,198,0.12)",
                label: quiz.status,
              };
            const skillCfg =
              SKILL_BADGE_STYLE[quiz.skill_level] || {
                color: "var(--muted)",
                bg: "rgba(169,172,198,0.12)",
              };

            return (
              <div
                key={quiz.id}
                className={`card ${styles.exerciseCard}`}
                onClick={() => setSelectedQuiz(quiz)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedQuiz(quiz)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardTitleRow}>
                    <div className={styles.exerciseTitle}>{quiz.title}</div>
                    <div className={styles.categoryTag}>
                      {CATEGORY_ICONS[quiz.category]} {quiz.category}
                    </div>
                  </div>
                  <div className={styles.cardBadgeRow}>
                    <span
                      className={styles.statusTag}
                      style={{
                        color: statusCfg.color,
                        background: statusCfg.bg,
                      }}
                    >
                      {statusCfg.label}
                    </span>
                    <span
                      className={styles.skillTag}
                      style={{
                        color: skillCfg.color,
                        background: skillCfg.bg,
                      }}
                    >
                      {quiz.skill_level}
                    </span>
                    {quiz.isAIGenerated && (
                      <span
                        className={styles.skillTag}
                        style={{
                          color: "#8b5cf6",
                          background: "rgba(139, 92, 246, 0.15)",
                          marginLeft: "4px"
                        }}
                      >
                        🤖 AI
                      </span>
                    )}
                  </div>
                </div>

                <div className="divider" />

                <div className={styles.scoreRow}>
                  <div>
                    <div className={styles.scoreLabel}>Questions</div>
                    <div className={styles.scoreValue}>
                      {quiz.question_count || "—"}
                    </div>
                  </div>
                  <div>
                    <div className={styles.scoreLabel}>Best Score</div>
                    <div className={styles.scoreValue}>
                      {quiz.best_score != null ? quiz.best_score : "—"}
                    </div>
                  </div>
                  <div>
                    <div className={styles.scoreLabel}>Avg Time</div>
                    <div className={styles.scoreValue}>
                      {quiz.avg_completion_time != null
                        ? `${quiz.avg_completion_time}s`
                        : "—"}
                    </div>
                  </div>
                  <div className={styles.expandHint}>Click to expand →</div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <div>No quizzes in this category yet. Generate one with AI!</div>
          </div>
        )}
      </Container>

      {/* Expanded Modal */}
      {selectedQuiz && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedQuiz(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedQuiz.title}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              onClick={() => setSelectedQuiz(null)}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalCategory}>
                  {CATEGORY_ICONS[selectedQuiz.category]}{" "}
                  {selectedQuiz.category}
                </div>
                <h3 className={styles.modalTitle}>{selectedQuiz.title}</h3>
              </div>
              <div className={styles.modalBadges}>
                <span
                  className={styles.statusTag}
                  style={{
                    color:
                      (STATUS_CONFIG[selectedQuiz.status] || {}).color ||
                      "var(--muted)",
                    background:
                      (STATUS_CONFIG[selectedQuiz.status] || {}).bg ||
                      "rgba(169,172,198,0.12)",
                  }}
                >
                  {(STATUS_CONFIG[selectedQuiz.status] || {}).label ||
                    selectedQuiz.status}
                </span>
                <span
                  className={styles.skillTag}
                  style={{
                    color:
                      (SKILL_BADGE_STYLE[selectedQuiz.skill_level] || {})
                        .color || "var(--muted)",
                    background:
                      (SKILL_BADGE_STYLE[selectedQuiz.skill_level] || {}).bg ||
                      "rgba(169,172,198,0.12)",
                  }}
                >
                  {selectedQuiz.skill_level}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className={styles.loreBlock}>
              <div className={styles.loreLabel}>About This Quiz</div>
              <p className={styles.loreText}>
                {selectedQuiz.lore_description}
              </p>
            </div>

            {/* Quiz Stats */}
            <div className={styles.techBlock}>
              <div className={styles.techLabel}>Quiz Details</div>
              <div className={styles.techGrid}>
                <div className={styles.techItem}>
                  <div className={styles.techItemLabel}>Total Questions</div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "var(--primary-soft)",
                    }}
                  >
                    {selectedQuiz.question_count}
                  </div>
                </div>
                <div className={styles.techItem}>
                  <div className={styles.techItemLabel}>Difficulty</div>
                  <div
                    style={{
                      padding: "6px 12px",
                      backgroundColor:
                        SKILL_BADGE_STYLE[selectedQuiz.skill_level]?.bg,
                      color: SKILL_BADGE_STYLE[selectedQuiz.skill_level]?.color,
                      borderRadius: "6px",
                      display: "inline-block",
                      fontWeight: "600",
                      fontSize: "12px",
                    }}
                  >
                    {selectedQuiz.skill_level}
                  </div>
                </div>
              </div>
            </div>

            {/* High Scores (only if attempted) */}
            {selectedQuiz.best_score != null && (
              <div className={styles.modalScores}>
                <div className={styles.modalScoreBox}>
                  <div className={styles.scoreLabel}>Best Score</div>
                  <div className={styles.modalScoreValue}>
                    {selectedQuiz.best_score}%
                  </div>
                </div>
                <div className={styles.modalScoreBox}>
                  <div className={styles.scoreLabel}>Accuracy</div>
                  <div className={styles.modalScoreValue}>
                    {selectedQuiz.accuracy}%
                  </div>
                </div>
                {selectedQuiz.avg_completion_time != null && (
                  <div className={styles.modalScoreBox}>
                    <div className={styles.scoreLabel}>Avg Time</div>
                    <div className={styles.modalScoreValue}>
                      {selectedQuiz.avg_completion_time}s
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className={styles.actionRow}>
              {selectedQuiz.status !== "Completed" ? (
                <button
                  className={`btn btn-primary ${styles.actionBtn}`}
                  onClick={() => handleStartQuiz(selectedQuiz)}
                >
                  {selectedQuiz.status === "Not Started" ? "▶ Start" : "▶ Resume"}
                </button>
              ) : (
                <button
                  className={`btn btn-outline ${styles.actionBtn}`}
                  onClick={() => handleStartQuiz(selectedQuiz)}
                >
                  ↩ Retake
                </button>
              )}
              <button
                className={`btn btn-ghost ${styles.actionBtn}`}
                onClick={() => setSelectedQuiz(null)}
              >
                Cancel
              </button>
              <button
                className={`btn ${styles.actionBtn}`}
                style={{
                  background: "rgba(255, 101, 132, 0.1)",
                  color: "var(--danger)",
                  border: "1px solid var(--danger)",
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
                onClick={() => handleDeleteQuiz(selectedQuiz)}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizPage;