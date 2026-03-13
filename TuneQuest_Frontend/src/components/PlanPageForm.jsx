import React, { useState } from "react";
import styles from "../styles/screens/PlanPageForm.module.css";

const CATEGORIES = [
  "Quizzes",
  "Technique",
  "Rhythm",
  "Knowledge",
  "Repertoire",
  "Ear Training",
];

const CATEGORY_ICONS = {
  Quizzes: "📝",
  Technique: "🎸",
  Rhythm: "🥁",
  Knowledge: "📚",
  Repertoire: "🎵",
  "Ear Training": "👂",
};

function PlanPageForm({ onSubmit, isLoading }) {
  const [durationGoal, setDurationGoal] = useState(30);
  const [focusAreas, setFocusAreas] = useState(["Rhythm", "Ear Training"]);
  const [difficulty, setDifficulty] = useState("balanced"); // "chill", "balanced", "push"
  const [wish, setWish] = useState("");
  const [errors, setErrors] = useState({});

  function handleToggleFocus(category) {
    setFocusAreas((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};

    if (durationGoal < 5) newErrors.durationGoal = "Minimum 5 minutes";
    if (durationGoal > 180) newErrors.durationGoal = "Maximum 180 minutes";
    if (focusAreas.length === 0)
      newErrors.focusAreas = "Select at least one focus area";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit({
      duration_goal: durationGoal,
      focus_areas: focusAreas,
      difficulty,
      wish: wish.trim(),
    });
  }

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>Customize Your Practice</h3>
        <p className={styles.formSubtitle}>
          Tell the AI what you want to work on today.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Duration Goal */}
        <div className={styles.formGroup}>
          <label htmlFor="duration" className={styles.label}>
            Duration Goal
          </label>
          <div className={styles.durationInput}>
            <input
              type="range"
              id="duration"
              min="5"
              max="180"
              step="5"
              value={durationGoal}
              onChange={(e) => setDurationGoal(Number(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.durationValue}>
              <strong>{durationGoal} min</strong>
            </div>
          </div>
          {errors.durationGoal && (
            <div className={styles.error}>{errors.durationGoal}</div>
          )}
        </div>

        {/* Focus Areas */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Focus Areas</label>
          <div className={styles.checkboxGrid}>
            {CATEGORIES.map((cat) => (
              <label key={cat} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={focusAreas.includes(cat)}
                  onChange={() => handleToggleFocus(cat)}
                  className={styles.checkboxInput}
                />
                <span className={styles.checkboxLabel}>
                  {CATEGORY_ICONS[cat]} {cat}
                </span>
              </label>
            ))}
          </div>
          {errors.focusAreas && (
            <div className={styles.error}>{errors.focusAreas}</div>
          )}
        </div>

        {/* Difficulty Toggle */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Difficulty</label>
          <div className={styles.difficultyGroup}>
            {[
              { value: "chill", label: "Keep it Chill", emoji: "😌" },
              { value: "balanced", label: "Balanced", emoji: "🎯" },
              { value: "push", label: "Push Me", emoji: "💪" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className={styles.difficultyButton}
                data-active={difficulty === opt.value ? "true" : "false"}
              >
                <span className={styles.difficultyEmoji}>{opt.emoji}</span>
                <span className={styles.difficultyLabel}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Free-text Wish */}
        <div className={styles.formGroup}>
          <label htmlFor="wish" className={styles.label}>
            Specific Request (Optional)
          </label>
          <textarea
            id="wish"
            placeholder='e.g., "Help me with Am to F chord changes" or "I want to learn Passenger"'
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            className={styles.textarea}
            rows={3}
            maxLength={200}
          />
          <div className={styles.charCount}>{wish.length} / 200</div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`btn btn-primary ${styles.submitButton}`}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "🚀 Generate Plan"}
        </button>
      </form>
    </div>
  );
}

export default PlanPageForm;
