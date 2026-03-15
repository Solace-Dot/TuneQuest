import React, { useState, useEffect } from "react";
import { Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { requestQuizGeneration, generateQuizFromFunctionCall, saveDailyPlan, getQuizForStep } from "../api/client";
import { cacheSong, storeQuizzes, cacheQuiz, updateExerciseSongPayload, updatePracticeStepProgress } from "../redux/slices/aiPlanSlice";
import api from "../api/client";
import styles from "../styles/screens/ExercisesPage.module.css";

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

// Goal → which exercise categories must be mastered to graduate
const GOAL_REQUIREMENTS = {
  'Performance Mastery':        ['Technique', 'Repertoire'],
  'Songwriting & Composition':  ['Rhythm', 'Knowledge'],
  'Boost Music Theory':         ['Knowledge', 'Ear Training'],
};

// Minimum 3 weeks; maximum depends on practice frequency
const GRADUATION_MAX_WEEKS = {
  'Daily':        4,
  '3x a week':    8,
  'Just for today': 12,
};

const MIN_GRAD_WEEKS = 3;

function getWeeksElapsed(planStartDate) {
  if (!planStartDate) return 0;
  const ms = Date.now() - new Date(planStartDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 7));
}

const DISCIPLINES = [
  "Technique",
  "Rhythm",
  "Knowledge",
  "Repertoire",
  "Ear Training",
];

const CATEGORY_ICONS = {
  Technique: "🎸",
  Rhythm: "🥁",
  Knowledge: "📚",
  Repertoire: "🎵",
  "Ear Training": "👂",
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

const isQuizRoute = (routeTo, category) => {
  if (routeTo === "QuizPage") return true;
  return category === "Quizzes" || category === "Knowledge" || category === "Ear Training";
};

const isSongRoute = (routeTo, category) => {
  if (routeTo === "SongManager" || routeTo === "MusicEngine") return true;
  return !isQuizRoute(routeTo, category);
};

const categoryPromptByQuizType = {
  "Knowledge": "Create a study-phase quiz focused on recognition, maps, and concept clarity.",
  "Ear Training": "Create an ear-training quiz focused on listening-based identification tasks.",
};

function ExercisesPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { skillLevel, instrument } = useSelector((state) => state.profile);
  const aiExercises = useSelector((state) => state.aiPlan.exercises);
  const aiSkillLevel = useSelector((state) => state.aiPlan.skillLevel);
  const aiInstrument = useSelector((state) => state.aiPlan.instrument);
  const aiQuizzes = useSelector((state) => state.aiPlan.quizzes);
  const learningGoal = useSelector((state) => state.aiPlan.learningGoal);
  const frequency    = useSelector((state) => state.aiPlan.frequency);
  const planStartDate = useSelector((state) => state.aiPlan.planStartDate);
  const songCache = useSelector((state) => state.aiPlan.songCache);
  const quizCache = useSelector((state) => state.aiPlan.quizCache);
  const dailyPlanId = useSelector((state) => state.aiPlan.dailyPlanId);
  const plan = useSelector((state) => state.aiPlan.plan);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedExercise, setSelectedExercise] = useState(null);
  // songPicker is non-null while the song chooser is open inside the modal
  // shape: { mode: 'library'|'composer', songTitle: string, loading: bool, error: string|null }
  const [songPicker, setSongPicker] = useState(null);
  const [quizLoadingExerciseId, setQuizLoadingExerciseId] = useState(null);
  const [quizError, setQuizError] = useState(null);

  const exercises = aiExercises;
  const completedCount = exercises.filter((ex) => ex.status === "Completed").length;
  const SLOT_LIMIT_DISPLAY = 5;

  // Auto-save exercises to backend with debounce
  useEffect(() => {
    if (!dailyPlanId || !exercises || exercises.length === 0) return;

    // Merge progress fields into existing plan steps so we preserve phase/duration metadata
    const baseSteps = Array.isArray(plan?.steps) ? plan.steps : [];
    const mergedSteps = exercises.map((exercise, idx) => {
      const existing = baseSteps.find((s) => s.id === exercise.id);
      return {
        ...(existing || {}),
        ...exercise,
        phase: exercise.phase || existing?.phase || ["Warm-up", "Core Work", "Challenge", "Cool Down"][Math.min(idx, 3)],
        duration_minutes: exercise.duration_minutes || existing?.duration_minutes || 10,
      };
    });
    const updatedPlan = plan ? { ...plan, steps: mergedSteps } : { steps: mergedSteps };

    const timer = setTimeout(async () => {
      try {
        await saveDailyPlan(
          dailyPlanId,
          updatedPlan,
          aiSkillLevel || skillLevel,
          aiInstrument || instrument
        );
        // Silently save without user notification to avoid distraction
      } catch (err) {
        // Silently fail to avoid overwhelming the user with errors
      }
    }, 2000); // Debounce by 2 seconds

    return () => clearTimeout(timer);
  }, [exercises, dailyPlanId, plan, aiSkillLevel, skillLevel, aiInstrument, instrument]);

  // --- Graduation Gate ---
  const weeksElapsed = getWeeksElapsed(planStartDate);
  const maxWeeks = GRADUATION_MAX_WEEKS[frequency] ?? 8;
  const targetWeeks = maxWeeks;
  const goalReqs = GOAL_REQUIREMENTS[learningGoal] || [];
  const goalReqsMet = goalReqs.every((cat) =>
    exercises.some((ex) => ex.category === cat && ex.status === "Completed")
  );
  const weeksMet = weeksElapsed >= MIN_GRAD_WEEKS;
  const canGraduate = goalReqsMet && weeksMet && (skillLevel || aiSkillLevel) === "Beginner";

  const tabs = ["All", ...DISCIPLINES];
  const filtered =
    activeTab === "All"
      ? exercises
      : exercises.filter((ex) => ex.category === activeTab);

  async function launchQuizSession(exercise) {
    setQuizLoadingExerciseId(exercise.id);
    setQuizError(null);

    try {
      // Check if quiz is already cached for this exercise
      if (quizCache[exercise.id]) {
        const cached = quizCache[exercise.id];
        dispatch(updatePracticeStepProgress({
          stepId: exercise.id,
          status: "In Progress",
        }));
        setSelectedExercise(null);
        setSongPicker(null);
        navigate("/quiz", {
          state: {
            autoStartQuizId: cached.quizObject.id,
            preloadedQuiz: cached.quizData,
            practiceStepId: exercise.id,
            practiceCategory: exercise.category,
          },
        });
        setQuizLoadingExerciseId(null);
        return;
      }

      // Check if quiz already exists in database for this exercise
      try {
        const existingQuizResponse = await getQuizForStep(exercise.id);
        if (existingQuizResponse?.quiz) {
          const existingQuiz = existingQuizResponse.quiz;
          // Cache it for next time
          dispatch(cacheQuiz({
            stepId: exercise.id,
            quizData: {
              id: existingQuiz.db_id,
              title: existingQuiz.title,
              questions: existingQuiz.questions,
              category: existingQuiz.category,
              skill_level: existingQuiz.skill_level,
            },
            quizObject: existingQuiz,
          }));
          
          dispatch(updatePracticeStepProgress({
            stepId: exercise.id,
            status: "In Progress",
          }));
          setSelectedExercise(null);
          setSongPicker(null);
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
              practiceStepId: exercise.id,
              practiceCategory: exercise.category,
            },
          });
          setQuizLoadingExerciseId(null);
          return;
        }
      } catch (err) {
        // Silently continue
      }

      // No cached or existing quiz - generate a new one
      const resolvedSkill = (aiSkillLevel || exercise.skill_level || skillLevel || "Beginner").toLowerCase();
      const resolvedInstrument = aiInstrument || instrument || "Guitar";
      const categoryGuidance = categoryPromptByQuizType[exercise.category] || categoryPromptByQuizType["Quizzes"];

      const userMessage = [
        `Generate a ${exercise.category} quiz for ${resolvedInstrument}.`,
        `Card title: ${exercise.title}.`,
        `Card description: ${exercise.lore_description || "No extra description."}`,
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
          topic: exercise.category,
          desired_category: exercise.category,
          source_title: exercise.title || exercise.category,
          instrument: resolvedInstrument,
          skill_level: resolvedSkill,
          practice_step_id: exercise.id,  // Link quiz to this exercise
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

      // Cache the quiz for this exercise
      dispatch(cacheQuiz({
        stepId: exercise.id,
        quizData,
        quizObject: newQuiz,
      }));

      dispatch(storeQuizzes([newQuiz, ...(aiQuizzes || []).filter((q) => q.id !== newQuiz.id)]));
      // Mark the exercise as "In Progress"
      dispatch(updatePracticeStepProgress({
        stepId: exercise.id,
        status: "In Progress",
      }));
      setSelectedExercise(null);
      setSongPicker(null);
      navigate("/quiz", {
        state: {
          autoStartQuizId: newQuiz.id,
          preloadedQuiz: quizData,
          practiceStepId: exercise.id,
          practiceCategory: exercise.category,
        },
      });
    } catch (err) {
      setQuizError(err.message || "Failed to generate quiz. Please try again.");
    } finally {
      setQuizLoadingExerciseId(null);
    }
  }

  function handleAction(exercise) {
    if (isQuizRoute(exercise.route_to, exercise.category)) {
      launchQuizSession(exercise);
    } else {
      // Ensure we get the latest exercise from Redux with the most recent songPayload
      const latestExercise = exercises.find((ex) => ex.id === exercise.id) || exercise;
      
      // Check for cached song in order of priority:
      // 1. Redux songCache (fastest, session-only)
      // 2. Exercise.songPayload (persisted from DB)
      // 3. SessionStorage (fallback if Redux lost the data)
      let cached = songCache[latestExercise.id] || (latestExercise.songPayload ? { songPayload: latestExercise.songPayload } : null);
      
      if (!cached) {
        try {
          const sessionData = sessionStorage.getItem(`song_${latestExercise.id}`);
          if (sessionData) {
            cached = { songPayload: JSON.parse(sessionData) };
          }
        } catch (err) {
          // Silently continue
        }
      }
      
      if (cached && cached.songPayload) {
        // Launch cached song immediately without showing picker
        setSelectedExercise(null);
        setSongPicker(null);
        navigate("/game/song", {
          state: {
            songPayload: cached.songPayload,
            practiceContext: {
              stepId: latestExercise.id,
              category: latestExercise.category,
              route_to: latestExercise.route_to,
              title: latestExercise.title,
            },
          },
        });
      } else {
        // No cached song: open picker to choose or generate
        setSongPicker({
          mode: "composer",
          songTitle: latestExercise.title || "",
          loading: false,
          error: null,
        });
      }
    }
  }

  async function launchSong() {
    const exercise = selectedExercise;
    const songTitle = (songPicker?.songTitle || exercise?.title || "").trim();

    if (!songTitle) {
      setSongPicker((prev) => ({ ...prev, error: "Please choose or enter a song title." }));
      return;
    }

    // Cache hit — reuse without API call (check both Redux cache and exercise object)
    const cached = songCache[exercise.id] || (exercise.songPayload ? { songPayload: exercise.songPayload } : null);
    if (cached && cached.songPayload) {
      // Save to sessionStorage as backup in case Redux loses it
      try {
        sessionStorage.setItem(`song_${exercise.id}`, JSON.stringify(cached.songPayload));
      } catch (err) {
        // Silently continue
      }
      
      setSelectedExercise(null);
      setSongPicker(null);
      navigate("/game/song", {
        state: {
          songPayload: cached.songPayload,
          practiceContext: {
            stepId: exercise.id,
            category: exercise.category,
            route_to: exercise.route_to,
            title: exercise.title,
          },
        },
      });
      return;
    }

    setSongPicker((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data } = await api.post("/api/ai/generate-song-timeline/", {
        song_title: songTitle,
        skill_level: aiSkillLevel || exercise.skill_level || "Beginner",
        instrument: aiInstrument || instrument || "Guitar",
        practice_card_title: exercise?.title || "",
        practice_card_description: exercise?.lore_description || "",
        practice_card_category: exercise?.category || "",
        generation_intent: songPicker?.mode === "composer" ? "practice_card" : "song_library",
      });
      dispatch(cacheSong({ stepId: exercise.id, songTitle, songPayload: data }));
      // Also store songPayload in the exercise so it gets persisted in the plan
      dispatch(updateExerciseSongPayload({ id: exercise.id, songPayload: data }));
      
      // Save to sessionStorage as backup in case Redux loses it
      try {
        sessionStorage.setItem(`song_${exercise.id}`, JSON.stringify(data));
      } catch (err) {
        // Silently continue
      }
      
      setSelectedExercise(null);
      setSongPicker(null);
      navigate("/game/song", {
        state: {
          songPayload: data,
          practiceContext: {
            stepId: exercise.id,
            category: exercise.category,
            route_to: exercise.route_to,
            title: exercise.title,
          },
        },
      });
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to generate song. Please try again.";
      setSongPicker((prev) => ({ ...prev, loading: false, error: msg }));
    }
  }

  const globalSkillLevel = skillLevel || "Beginner";

  return (
    <div className="page-shell">
      <Container fluid>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <h2 className="section-title">Exercise Inventory</h2>
            <p className="subtext">
              Your journey toward the Intermediate Graduation Gate
            </p>
          </div>
          <div className={styles.skillBadge}>
            <span className={styles.skillDot} />
            {globalSkillLevel}
          </div>
        </div>

        {/* Tier Status Bar */}
        <div className={`card ${styles.tierBar}`}>
          <div className={styles.tierBarInner}>
            <div>
              <div className={styles.tierLabel}>Completed Slots</div>
              <div className={styles.tierCount}>
                {completedCount}/{SLOT_LIMIT_DISPLAY} Used
              </div>
            </div>
            <div className={styles.tierSlots}>
              {Array.from({ length: SLOT_LIMIT_DISPLAY }).map((_, i) => (
                <div
                  key={i}
                  className={styles.slot}
                  data-filled={i < completedCount ? "true" : "false"}
                />
              ))}
            </div>
            {completedCount >= SLOT_LIMIT_DISPLAY && (
              <div className={styles.tierWarning}>
                ⚠ Slot limit reached — archive an exercise to continue
              </div>
            )}
          </div>
        </div>

        {/* Graduation Gate */}
        {(skillLevel || aiSkillLevel) === "Beginner" && (
          <div className={`card ${styles.sealCard}`} style={{ marginBottom: 0 }}>
            <div className={styles.sealHeader}>
              <span className={styles.sealTitle}>🎓 Beginner → Intermediate Graduation Gate</span>
              <span className={styles.sealSubtitle}>
                {learningGoal ? `Goal: ${learningGoal}` : "Complete a practice plan to unlock your graduation path"}
              </span>
            </div>

            {/* Week timeline */}
            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                <span>Week {Math.min(weeksElapsed, targetWeeks)} of {targetWeeks}</span>
                <span style={{ color: weeksMet ? "var(--success)" : "var(--muted)" }}>
                  {weeksMet ? "✔ Min. 3 weeks met" : `${Math.max(0, MIN_GRAD_WEEKS - weeksElapsed)} week(s) until eligible`}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: targetWeeks }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: 8, borderRadius: 4,
                      background: i < weeksElapsed
                        ? "var(--primary)"
                        : i < MIN_GRAD_WEEKS
                        ? "rgba(129,92,249,0.25)"
                        : "rgba(255,255,255,0.08)",
                      transition: "background 0.3s",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {Array.from({ length: targetWeeks }).map((_, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: i < MIN_GRAD_WEEKS ? "var(--primary-soft)" : "var(--muted)" }}>
                    {i === MIN_GRAD_WEEKS - 1 ? "Min" : i === targetWeeks - 1 ? "Max" : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Goal-specific requirements */}
            {goalReqs.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                {goalReqs.map((cat) => {
                  const met = exercises.some((ex) => ex.category === cat && ex.status === "Completed");
                  return (
                    <div
                      key={cat}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                        background: met ? "rgba(99,230,190,0.12)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${met ? "var(--success)" : "var(--border)"}`,
                        color: met ? "var(--success)" : "var(--muted)",
                      }}
                    >
                      {met ? "✔" : "○"} {CATEGORY_ICONS[cat]} {cat}
                    </div>
                  );
                })}
              </div>
            )}

            {/* CTA */}
            <button
              className={`btn ${canGraduate ? "btn-primary" : "btn-outline"}`}
              disabled={!canGraduate}
              style={{ width: "100%", opacity: canGraduate ? 1 : 0.5 }}
              onClick={() => canGraduate && alert("🎓 Congratulations! Contact support or complete your assessment to officially graduate to Intermediate.")}
            >
              {canGraduate
                ? "🎓 Graduate to Intermediate!"
                : goalReqs.length === 0
                ? "Generate a plan to unlock graduation requirements"
                : `Complete ${goalReqs.filter((c) => !exercises.some((e) => e.category === c && e.status === "Completed")).join(" & ")} exercises + ${Math.max(0, MIN_GRAD_WEEKS - weeksElapsed)} more week(s)`}
            </button>
          </div>
        )}

        {/* Discipline Navigation Tabs */}
        <div className={styles.tabNav}>          {tabs.map((tab) => (
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

        {/* Exercise Card Grid */}
        <div className={styles.cardGrid}>
          {filtered.map((ex) => {
            const statusCfg = STATUS_CONFIG[ex.status] || { color: "var(--muted)", bg: "rgba(169,172,198,0.12)", label: ex.status };
            const skillCfg = SKILL_BADGE_STYLE[ex.skill_level] || { color: "var(--muted)", bg: "rgba(169,172,198,0.12)" };
            return (
              <div
                key={ex.id}
                className={`card ${styles.exerciseCard}`}
                onClick={() => setSelectedExercise(ex)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedExercise(ex)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardTitleRow}>
                    <div className={styles.exerciseTitle}>{ex.title}</div>
                    <div className={styles.categoryTag}>
                      {CATEGORY_ICONS[ex.category]} {ex.category}
                    </div>
                  </div>
                  <div className={styles.cardBadgeRow}>
                    <span
                      className={styles.statusTag}
                      style={{ color: statusCfg.color, background: statusCfg.bg }}
                    >
                      {statusCfg.label}
                    </span>
                    <span
                      className={styles.skillTag}
                      style={{ color: skillCfg.color, background: skillCfg.bg }}
                    >
                      {ex.skill_level}
                    </span>
                  </div>
                </div>

                <div className="divider" />

                <div className={styles.scoreRow}>
                  <div>
                    <div className={styles.scoreLabel}>Best Score</div>
                    <div className={styles.scoreValue}>
                      {ex.best_score != null ? ex.best_score : "—"}
                    </div>
                  </div>
                  <div>
                    <div className={styles.scoreLabel}>Accuracy</div>
                    <div className={styles.scoreValue}>
                      {ex.accuracy != null ? `${ex.accuracy}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className={styles.scoreLabel}>Avg Time</div>
                    <div className={styles.scoreValue}>
                      {ex.avg_completion_time != null
                        ? `${Math.ceil(ex.avg_completion_time)}s`
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
            <div>No exercises in this discipline yet.</div>
          </div>
        )}
      </Container>

      {/* Expanded Modal */}
      {selectedExercise && (
        <div
          className={styles.modalOverlay}
          onClick={() => { setSelectedExercise(null); setSongPicker(null); }}
          role="dialog"
          aria-modal="true"
          aria-label={selectedExercise.title}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              onClick={() => { setSelectedExercise(null); setSongPicker(null); }}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalCategory}>
                  {CATEGORY_ICONS[selectedExercise.category]}{" "}
                  {selectedExercise.category}
                </div>
                <h3 className={styles.modalTitle}>{selectedExercise.title}</h3>
              </div>
              <div className={styles.modalBadges}>
                <span
                  className={styles.statusTag}
                  style={{
                    color: (STATUS_CONFIG[selectedExercise.status] || {}).color || "var(--muted)",
                    background: (STATUS_CONFIG[selectedExercise.status] || {}).bg || "rgba(169,172,198,0.12)",
                  }}
                >
                  {(STATUS_CONFIG[selectedExercise.status] || {}).label || selectedExercise.status}
                </span>
                <span
                  className={styles.skillTag}
                  style={{
                    color: (SKILL_BADGE_STYLE[selectedExercise.skill_level] || {}).color || "var(--muted)",
                    background: (SKILL_BADGE_STYLE[selectedExercise.skill_level] || {}).bg || "rgba(169,172,198,0.12)",
                  }}
                >
                  {selectedExercise.skill_level}
                </span>
              </div>
            </div>

            {/* Lore Description */}
            <div className={styles.loreBlock}>
              <div className={styles.loreLabel}>Lore</div>
              <p className={styles.loreText}>{selectedExercise.lore_description}</p>
            </div>

            {/* Technical Preview */}
            <div className={styles.techBlock}>
              <div className={styles.techLabel}>Technical Preview</div>
              {isSongRoute(selectedExercise.route_to, selectedExercise.category) ? (
                <div className={styles.techGrid}>
                  <div className={styles.techItem}>
                    <div className={styles.techItemLabel}>Target BPM</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '6px' }}>
                      The tempo you should aim for
                    </div>
                    <div className={styles.bpmDisplay}>
                      {selectedExercise.technical_payload.bpm}
                    </div>
                    {selectedExercise.technical_payload.pattern && (
                      <>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '8px', marginBottom: '4px' }}>
                          Strumming Pattern
                        </div>
                        <div className={styles.patternTag}>
                          {selectedExercise.technical_payload.pattern}
                        </div>
                      </>
                    )}
                  </div>
                  <div className={styles.techItem}>
                    <div className={styles.techItemLabel}>Chord Progression</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '6px' }}>
                      Chords you'll use in this song
                    </div>
                    <div className={styles.chordRow}>
                      {(selectedExercise.technical_payload.chords || []).map((chord) => (
                        <div key={chord} className={styles.chordChip}>
                          {chord}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.techItem}>
                  <div className={styles.techItemLabel}>Question Type</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '6px' }}>
                    Format of this quiz
                  </div>
                  <div className={styles.questionTypeBadge}>
                    {selectedExercise.technical_payload.questionType}
                  </div>
                </div>
              )}
            </div>

            {/* High Scores (only if the exercise has been attempted) */}
            {selectedExercise.best_score != null && (
              <div className={styles.modalScores}>
                <div className={styles.modalScoreBox}>
                  <div className={styles.scoreLabel}>Best Score</div>
                  <div className={styles.modalScoreValue}>
                    {selectedExercise.best_score}
                  </div>
                </div>
                <div className={styles.modalScoreBox}>
                  <div className={styles.scoreLabel}>Accuracy</div>
                  <div className={styles.modalScoreValue}>
                    {selectedExercise.accuracy}%
                  </div>
                </div>
                {selectedExercise.avg_completion_time != null && (
                  <div className={styles.modalScoreBox}>
                    <div className={styles.scoreLabel}>Avg Time</div>
                    <div className={styles.modalScoreValue}>
                      {Math.ceil(selectedExercise.avg_completion_time)}s
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Song Picker (replaces action buttons when open for MusicEngine exercises) */}
            {songPicker ? (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>🎵 Choose Your Song</div>

                {/* Mode tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <button
                    className={`btn ${songPicker.mode === "library" ? "btn-primary" : "btn-outline"}`}
                    style={{ fontSize: 12, padding: "6px 14px", borderRadius: 999 }}
                    onClick={() => setSongPicker((p) => ({ ...p, mode: "library", songTitle: "", error: null }))}
                  >
                    📚 Library
                  </button>
                  <button
                    className={`btn ${songPicker.mode === "composer" ? "btn-primary" : "btn-outline"}`}
                    style={{ fontSize: 12, padding: "6px 14px", borderRadius: 999 }}
                    onClick={() => setSongPicker((p) => ({ ...p, mode: "composer", songTitle: "", error: null }))}
                  >
                    🤖 AI Composer
                  </button>
                </div>

                {songPicker.mode === "library" ? (
                  <select
                    className={styles.songSelect}
                    value={songPicker.songTitle}
                    onChange={(e) => setSongPicker((p) => ({ ...p, songTitle: e.target.value, error: null }))}
                  >
                    <option value="">-- Choose a verified classic --</option>
                    {VERIFIED_CLASSICS.map((s) => (
                      <option key={s.title} value={s.title}>{s.title} · {s.composer}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Breathe – Pink Floyd..."
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                      color: "var(--text)", fontSize: 13, marginBottom: 6,
                    }}
                    value={songPicker.songTitle}
                    onChange={(e) => setSongPicker((p) => ({ ...p, songTitle: e.target.value, error: null }))}
                  />
                )}

                {(() => {
                  const cached = songCache[selectedExercise.id];
                  const isCacheHit = !!cached && !!cached.songPayload;
                  return (
                    <>
                      {cached && !isCacheHit && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                          ♻ Previously played: <strong style={{ color: "var(--primary-soft)" }}>{cached.songTitle}</strong>
                        </div>
                      )}
                      {songPicker.error && (
                        <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 6 }}>{songPicker.error}</div>
                      )}
                      <div className={styles.actionRow} style={{ marginTop: 8 }}>
                        <button
                          className={`btn btn-primary ${styles.actionBtn}`}
                          disabled={songPicker.loading || !songPicker.songTitle.trim()}
                          onClick={launchSong}
                        >
                          {songPicker.loading ? "⏳ Generating…" : isCacheHit ? "♻ Launch (Cached)" : "🎸 Launch Song"}
                        </button>
                        <button
                          className={`btn btn-ghost ${styles.actionBtn}`}
                          onClick={() => setSongPicker(null)}
                        >
                          ← Back
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              /* Normal Action Buttons */
              <div className={styles.actionRow}>
                {quizError && (
                  <div style={{ color: "var(--danger)", width: "100%", fontSize: 12 }}>
                    {quizError}
                  </div>
                )}
                {selectedExercise.status !== "Completed" ? (
                  <button
                    className={`btn btn-primary ${styles.actionBtn}`}
                    onClick={() => handleAction(selectedExercise)}
                    disabled={quizLoadingExerciseId === selectedExercise.id}
                  >
                    {quizLoadingExerciseId === selectedExercise.id
                      ? "⏳ Preparing Quiz"
                      : selectedExercise.status === "Not Started"
                      ? "▶  Play"
                      : "▶  Resume"}
                  </button>
                ) : (
                  <button
                    className={`btn btn-outline ${styles.actionBtn}`}
                    onClick={() => handleAction(selectedExercise)}
                    disabled={quizLoadingExerciseId === selectedExercise.id}
                  >
                    {quizLoadingExerciseId === selectedExercise.id ? "⏳ Preparing Quiz" : "↩  Try Again"}
                  </button>
                )}
                <button
                  className={`btn btn-ghost ${styles.actionBtn}`}
                  onClick={() => { setSelectedExercise(null); setSongPicker(null); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExercisesPage;

