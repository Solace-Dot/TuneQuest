import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { requestQuizGeneration, generateQuizFromFunctionCall, getQuizForStep } from "../api/client";
import { cacheSong, storeQuizzes, cacheQuiz, updateExerciseSongPayload } from "../redux/slices/aiPlanSlice";
import api from "../api/client";
import styles from "../styles/screens/PracticePlanPage.module.css";

const VERIFIED_CLASSICS = [
  { title: "Ode to Joy", composer: "Beethoven" },
  { title: "Twinkle Twinkle Little Star", composer: "Traditional" },
  { title: "Mary Had a Little Lamb", composer: "Traditional" },
  { title: "Happy Birthday", composer: "Traditional" },
  { title: "Greensleeves", composer: "Traditional" },
  { title: "Amazing Grace", composer: "Traditional" },
  { title: "House of the Rising Sun", composer: "The Animals" },
  { title: "Smoke on the Water", composer: "Deep Purple" },
  { title: "Seven Nation Army", composer: "The White Stripes" },
  { title: "Wonderwall", composer: "Oasis" },
  { title: "Knockin' on Heaven's Door", composer: "Bob Dylan" },
  { title: "Blackbird", composer: "The Beatles" },
  { title: "Yesterday", composer: "The Beatles" },
  { title: "Hallelujah", composer: "Leonard Cohen" },
  { title: "Wish You Were Here", composer: "Pink Floyd" },
  { title: "Nothing Else Matters", composer: "Metallica" },
  { title: "Tears in Heaven", composer: "Eric Clapton" },
];
const CATEGORY_ICONS = {
  Quizzes: "📝",
  Technique: "🎸",
  Rhythm: "🥁",
  Knowledge: "📚",
  Repertoire: "🎵",
  "Ear Training": "👂",
};

// Exercise phases for organization
const PHASES = ["Warm-up", "Core Work", "Challenge", "Cool Down"];

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

const QUIZ_CATEGORIES = new Set(["Quizzes", "Knowledge", "Ear Training"]);

const isQuizRoute = (routeTo, category) => {
  if (routeTo === "QuizPage") return true;
  return QUIZ_CATEGORIES.has(category);
};

const isSongRoute = (routeTo, category) => {
  if (routeTo === "SongManager" || routeTo === "MusicEngine") return true;
  return !isQuizRoute(routeTo, category);
};

const categoryPromptByQuizType = {
  "Knowledge": "Create a study-phase quiz focused on recognition, maps, and concept clarity.",
  "Quizzes": "Create a validation quiz using multiple-choice and term/scale-degree checks.",
  "Ear Training": "Create an ear-training quiz focused on listening-based identification tasks.",
};

function PracticePlanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { instrument, skillLevel } = useSelector((state) => state.profile);
  const aiPlan = useSelector((state) => state.aiPlan.plan);
  const aiSkillLevel = useSelector((state) => state.aiPlan.skillLevel);
  const aiInstrument = useSelector((state) => state.aiPlan.instrument);
  const aiQuizzes = useSelector((state) => state.aiPlan.quizzes);
  const songCache = useSelector((state) => state.aiPlan.songCache);
  const quizCache = useSelector((state) => state.aiPlan.quizCache);
  const [songSelector, setSongSelector] = useState(null);
  const [quizLoadingStepId, setQuizLoadingStepId] = useState(null);
  const [quizErrorByStepId, setQuizErrorByStepId] = useState({});
  // shape: { step, mode: 'library'|'composer', songTitle: '', loading: false, error: null }

  // Priority: Redux (AI-generated) > location.state (legacy nav) > null (show empty state)
  const plan = aiPlan || (location.state?.plan ? adaptPlan(location.state.plan) : null);

  function adaptPlan(rawPlan) {
    // rawPlan comes from PracticePlanForm's mock generator structure
    // Map it to PracticePlanPage's expected structure
    const phases = ["Warm-up", "Core Work", "Challenge", "Cool Down"];
    return {
      title: rawPlan.plan_header?.title || "Your Practice Session",
      focus: rawPlan.plan_header?.subtitle || "Custom Plan",
      duration_goal: rawPlan.daily_steps?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 30,
      streak: 0,
      total_steps: rawPlan.daily_steps?.length || 0,
      completed_steps: 0,
      steps: (rawPlan.daily_steps || []).map((step, i) => ({
        id: step.id || `step-${i}`,
        phase: phases[Math.min(i, phases.length - 1)],
        exercise_id: step.id,
        title: step.title,
        category: step.category || "General",
        route_to:
          step.route_to ||
          (QUIZ_CATEGORIES.has(step.category) ? "QuizPage" : "SongManager"),
        status: step.status || "Not Started",
        skill_level: step.skill_level || "Beginner",
        duration_minutes: step.duration_minutes || 10,
        lore_description: step.description || "",
        technical_payload: {},
      })),
    };
  }

  async function launchQuizSession(step) {
    setQuizLoadingStepId(step.id);
    setQuizErrorByStepId((prev) => ({ ...prev, [step.id]: null }));

    try {
      // Check if quiz is already cached for this step
      if (quizCache[step.id]) {
        const cached = quizCache[step.id];
        navigate("/quiz", {
          state: {
            autoStartQuizId: cached.quizObject.id,
            preloadedQuiz: cached.quizData,
            practiceStepId: step.id,
            practiceCategory: step.category,
          },
        });
        setQuizLoadingStepId(null);
        return;
      }

      // Check if quiz already exists in database for this step
      try {
        const existingQuizResponse = await getQuizForStep(step.id);
        if (existingQuizResponse?.quiz) {
          const existingQuiz = existingQuizResponse.quiz;
          // Cache it for next time
          dispatch(cacheQuiz({
            stepId: step.id,
            quizData: {
              id: existingQuiz.db_id,
              title: existingQuiz.title,
              questions: existingQuiz.questions,
              category: existingQuiz.category,
              skill_level: existingQuiz.skill_level,
            },
            quizObject: existingQuiz,
          }));
          
          navigate("/quiz", {
            state: {
              autoStartQuizId: existingQuiz.id,
              preloadedQuiz: existingQuiz.questions ? {
                id: existingQuiz.db_id,
                title: existingQuiz.title,
                questions: existingQuiz.questions,
                category: existingQuiz.category,
                skill_level: existingQuiz.skill_level,
              } : null,
              practiceStepId: step.id,
              practiceCategory: step.category,
            },
          });
          setQuizLoadingStepId(null);
          return;
        }
      } catch (err) {
        // Silently continue
      }

      // No cached or existing quiz - generate a new one
      const resolvedSkill = (aiSkillLevel || step.skill_level || skillLevel || "Beginner").toLowerCase();
      const resolvedInstrument = aiInstrument || instrument || "Guitar";
      const categoryGuidance = categoryPromptByQuizType[step.category] || categoryPromptByQuizType["Quizzes"];

      const userMessage = [
        `Generate a ${step.category} quiz for ${resolvedInstrument}.`,
        `Card title: ${step.title}.`,
        `Card description: ${step.lore_description || "No extra description."}`,
        `Skill level: ${resolvedSkill}.`,
        categoryGuidance,
      ].join(" ");

      const detection = await requestQuizGeneration(userMessage);
      if (!detection?.function_call) {
        throw new Error("No quiz request was detected for this practice card.");
      }

      const functionCall = {
        ...detection.function_call,
        args: {
          ...(detection.function_call.args || {}),
          topic: step.category,
          desired_category: step.category,
          source_title: step.title || step.category,
          instrument: resolvedInstrument,
          skill_level: resolvedSkill,
          practice_step_id: step.id,  // Link quiz to this step
        },
      };

      const quizData = await generateQuizFromFunctionCall(functionCall);
      const newQuiz = {
        id: `ai-quiz-${quizData.id}`,
        db_id: quizData.id,
        title: quizData.title,
        category: quizData.category,
        status: "Not Started",
        skill_level: quizData.skill_level,
        best_score: null,
        accuracy: null,
        avg_completion_time: null,
        question_count: quizData.questions?.length || 5,
        lore_description: quizData.lore_description,
        questions: quizData.questions,
        isAIGenerated: true,
        createdAt: quizData.created_at,
      };

      // Cache the quiz for this step
      dispatch(cacheQuiz({
        stepId: step.id,
        quizData,
        quizObject: newQuiz,
      }));

      dispatch(storeQuizzes([newQuiz, ...(aiQuizzes || []).filter((q) => q.id !== newQuiz.id)]));
      navigate("/quiz", {
        state: {
          autoStartQuizId: newQuiz.id,
          preloadedQuiz: quizData,
          practiceStepId: step.id,
          practiceCategory: step.category,
        },
      });
    } catch (err) {
      const msg = err.message || "Failed to generate quiz. Please try again.";
      setQuizErrorByStepId((prev) => ({ ...prev, [step.id]: msg }));
    } finally {
      setQuizLoadingStepId(null);
    }
  }

  function handleStartPractice(step) {
    if (isQuizRoute(step.route_to, step.category)) {
      launchQuizSession(step);
    } else {
      // For song routes: check if there's a cached song (in Redux, step object, or sessionStorage)
      let cached = songCache[step.id] || (step.songPayload ? { songPayload: step.songPayload } : null);
      
      if (!cached) {
        try {
          const sessionData = sessionStorage.getItem(`song_${step.id}`);
          if (sessionData) {
            cached = { songPayload: JSON.parse(sessionData) };
          }
        } catch (err) {
          // Silently continue
        }
      }
      
      if (cached && cached.songPayload) {
        // Save to sessionStorage as backup in case Redux loses it
        try {
          sessionStorage.setItem(`song_${step.id}`, JSON.stringify(cached.songPayload));
        } catch (err) {
          // Silently continue
        }
        
        // Launch cached song immediately without showing selector
        navigate("/game/song", {
          state: {
            songPayload: cached.songPayload,
            practiceContext: {
              stepId: step.id,
              category: step.category,
              route_to: step.route_to,
              title: step.title,
            },
          },
        });
      } else {
        // No cached song: open selector to choose or generate
        setSongSelector((prev) => {
          if (prev?.step?.id === step.id) return null;
          return {
            step,
            mode: "composer",
            songTitle: step.title || "",
            loading: false,
            error: null,
          };
        });
      }
    }
  }

  async function launchSong() {
    const { step, songTitle, mode } = songSelector;
    const resolvedSongTitle = (songTitle || step?.title || "").trim();

    if (!resolvedSongTitle) {
      setSongSelector((prev) => ({ ...prev, error: "Please choose or enter a song title." }));
      return;
    }

    // Check cache: if a song was already generated for this step, reuse it (check Redux cache, step object, or sessionStorage)
    let cached = songCache[step.id] || (step.songPayload ? { songPayload: step.songPayload } : null);
    
    if (!cached) {
      try {
        const sessionData = sessionStorage.getItem(`song_${step.id}`);
        if (sessionData) {
          cached = { songPayload: JSON.parse(sessionData) };
        }
      } catch (err) {
        // Silently continue
      }
    }
    
    if (cached && cached.songPayload) {
      // Save to sessionStorage as backup in case Redux loses it
      try {
        sessionStorage.setItem(`song_${step.id}`, JSON.stringify(cached.songPayload));
      } catch (err) {
        // Silently continue
      }
      
      navigate("/game/song", {
        state: {
          songPayload: cached.songPayload,
          practiceContext: {
            stepId: step.id,
            category: step.category,
            route_to: step.route_to,
            title: step.title,
          },
        },
      });
      return;
    }

    setSongSelector((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data } = await api.post("/api/ai/generate-song-timeline/", {
        song_title: resolvedSongTitle,
        skill_level: aiSkillLevel || step.skill_level || "Beginner",
        instrument: aiInstrument || instrument || "Guitar",
        practice_card_title: step?.title || "",
        practice_card_description: step?.lore_description || "",
        practice_card_category: step?.category || "",
        generation_intent: mode === "composer" ? "practice_card" : "song_library",
      });
      // Save to Redux cache so the next launch for this step is instant
      dispatch(cacheSong({ stepId: step.id, songTitle: resolvedSongTitle, songPayload: data }));
      // Also store songPayload in the step so it gets persisted in the plan_json
      dispatch(updateExerciseSongPayload({ id: step.id, songPayload: data }));
      
      // Save to sessionStorage as backup in case Redux loses it
      try {
        sessionStorage.setItem(`song_${step.id}`, JSON.stringify(data));
      } catch (err) {
        // Silently continue
      }
      
      navigate("/game/song", {
        state: {
          songPayload: data,
          practiceContext: {
            stepId: step.id,
            category: step.category,
            route_to: step.route_to,
            title: step.title,
          },
        },
      });
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to generate song. Please try again.";
      setSongSelector((prev) => ({ ...prev, loading: false, error: msg }));
    }
  }

  if (!plan) return (
    <div className="page-shell">
      <Container fluid>
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <p style={{ fontSize: 16, marginBottom: 20 }}>No practice plan yet. Generate one to get started!</p>
          <button className="btn btn-primary" onClick={() => navigate("/plan/form")}>
            Generate Plan
          </button>
        </div>
      </Container>
    </div>
  );

  const completionPercent = Math.round(
    (plan.completed_steps / plan.total_steps) * 100
  );

  const stepsByPhase = {};
  PHASES.forEach((phase) => {
    stepsByPhase[phase] = plan.steps.filter((s) => s.phase === phase);
  });

  return (
    <div className="page-shell">
      <Container fluid>
        {/* Regenerate Button */}
        <div style={{ marginBottom: "16px", textAlign: "center" }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/plan/form")}
          >
            Regenerate Plan
          </button>
        </div>

        {/* Focus Header */}
        <div className={styles.focusHeader}>
          <div className={styles.headerContent}>
            <div>
              <div className={styles.label}>Today's Focus</div>
              <h2 className={styles.focusTitle}>{plan.focus}</h2>
              <div className={styles.metaRow}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Duration Goal</span>
                  <span className={styles.metaValue}>{plan.duration_goal} min</span>
                </div>
                <div className={styles.dividerVertical} />
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Streak</span>
                  <span className={styles.metaValue}>🔥 {plan.streak} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Progress Bar */}
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <span>Today's Tasks</span>
              <span className={styles.progressCount}>
                {plan.completed_steps}/{plan.total_steps}
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className={styles.progressText}>
              {completionPercent}% complete
            </div>
          </div>
        </div>

        {/* Active Routine - Steps organized by phase */}
        {PHASES.map((phase) => {
          const phaseSteps = stepsByPhase[phase];
          if (phaseSteps.length === 0) return null;

          return (
            <div key={phase} className={styles.phaseSection}>
              <div className={styles.phaseHeader}>
                <h3 className={styles.phaseTitle}>{phase}</h3>
                <span className={styles.phaseCount}>
                  {phaseSteps.length} step{phaseSteps.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className={styles.stepsGrid}>
                {phaseSteps.map((step) => {
                  const statusCfg = STATUS_CONFIG[step.status] || {};
                  return (
                    <div
                      key={step.id}
                      className={`card ${styles.activeCard}`}
                      data-status={step.status}
                    >
                      {/* Card Header */}
                      <div className={styles.activeCardHeader}>
                        <div className={styles.cardMeta}>
                          <div className={styles.categoryBadge}>
                            {CATEGORY_ICONS[step.category]} {step.category}
                          </div>
                          <span
                            className={styles.statusBadge}
                            style={{
                              color: statusCfg.color || "var(--muted)",
                              background: statusCfg.bg || "rgba(169,172,198,0.12)",
                            }}
                          >
                            {statusCfg.label || step.status}
                          </span>
                        </div>
                        <div className={styles.durationBadge}>
                          ⏱ {step.duration_minutes} min
                        </div>
                      </div>

                      {/* Card Title */}
                      <h4 className={styles.activeCardTitle}>{step.title}</h4>

                      {/* Lore Description */}
                      <p className={styles.loreSnippet}>
                        {step.lore_description}
                      </p>

                      {/* Quick Stats (only for in-progress/completed) */}
                      {step.status !== "Not Started" && (
                        <div className={styles.stepStats}>
                          {isSongRoute(step.route_to, step.category) ? (
                            <>
                              <div className={styles.statItem}>
                                <span className={styles.statLabel}>BPM</span>
                                <span className={styles.statValue}>
                                  {step.technical_payload.bpm}
                                </span>
                              </div>
                              <div className={styles.statItem}>
                                <span className={styles.statLabel}>Pattern</span>
                                <span className={styles.statValue}>
                                  {step.technical_payload.pattern}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className={styles.statItem}>
                              <span className={styles.statLabel}>Type</span>
                              <span className={styles.statValue}>
                                {step.technical_payload.questionType}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        className={`btn btn-primary ${styles.startButton}`}
                        onClick={() => handleStartPractice(step)}
                        disabled={quizLoadingStepId === step.id}
                      >
                        {quizLoadingStepId === step.id
                          ? "⏳ Preparing Quiz"
                          : isSongRoute(step.route_to, step.category) && songSelector?.step?.id === step.id
                          ? "✕ Cancel"
                          : step.status === "Not Started"
                          ? "▶ Start Practice"
                          : step.status === "In Progress"
                          ? "▶ Resume Practice"
                          : "↩ Try Again"}
                      </button>

                      {quizErrorByStepId[step.id] && (
                        <p className={styles.loreSnippet} style={{ color: "var(--danger)", marginTop: 8 }}>
                          {quizErrorByStepId[step.id]}
                        </p>
                      )}

                      {/* Inline Song Selector (expands for MusicEngine steps) */}
                      {songSelector?.step?.id === step.id && (
                        <div className={styles.songSelector}>
                          <div className={styles.selectorLabel}>🎵 Choose Your Song</div>

                          {/* Mode Tabs */}
                          <div className={styles.selectorTabs}>
                            <button
                              className={`${styles.tabBtn} ${songSelector.mode === "library" ? styles.tabActive : ""}`}
                              onClick={() => setSongSelector((prev) => ({ ...prev, mode: "library", songTitle: "", error: null }))}
                            >
                              📚 The Library
                            </button>
                            <button
                              className={`${styles.tabBtn} ${songSelector.mode === "composer" ? styles.tabActive : ""}`}
                              onClick={() => setSongSelector((prev) => ({ ...prev, mode: "composer", songTitle: "", error: null }))}
                            >
                              🤖 AI Composer
                            </button>
                          </div>

                          {songSelector.mode === "library" ? (
                            <>
                              <select
                                className={styles.songSelect}
                                value={songSelector.songTitle}
                                onChange={(e) => setSongSelector((prev) => ({ ...prev, songTitle: e.target.value, error: null }))}
                              >
                                <option value="">-- Choose a verified classic --</option>
                                {VERIFIED_CLASSICS.map((s) => (
                                  <option key={s.title} value={s.title}>
                                    {s.title} · {s.composer}
                                  </option>
                                ))}
                              </select>
                              <div className={styles.selectorHint}>
                                ✅ These songs have been verified for accuracy
                              </div>
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                className={styles.songInput}
                                placeholder="Card-aligned title (defaults to this step title)"
                                value={songSelector.songTitle}
                                onChange={(e) => setSongSelector((prev) => ({ ...prev, songTitle: e.target.value, error: null }))}
                              />
                              <div className={styles.selectorHint}>
                                🤖 AI will shape the timeline to match this card's title and instructions
                              </div>
                            </>
                          )}

                          {songSelector.error && (
                            <div className={styles.selectorError}>{songSelector.error}</div>
                          )}

                          {/* Cache hint: show previously played song */}
                          {(() => {
                            const cached = songCache[songSelector.step.id];
                            const isCacheHit = !!cached && !!cached.songPayload;
                            return (
                              <>
                                {cached && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4, marginBottom: 4 }}>
                                    ♻ Previously played: <strong style={{ color: 'var(--primary-soft)' }}>{cached.songTitle}</strong>
                                  </div>
                                )}
                                <button
                                  className={`btn btn-primary ${styles.launchBtn}`}
                                  disabled={songSelector.loading || !songSelector.songTitle.trim()}
                                  onClick={launchSong}
                                >
                                  {songSelector.loading ? "⏳ Generating…" : isCacheHit ? "♻ Launch (Cached)" : "🎸 Launch Song"}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {plan.total_steps === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <p>No practice steps for today. Create a new plan to get started!</p>
          </div>
        )}
      </Container>
    </div>
  );
}

export default PracticePlanPage;

