import React, { useState } from "react";
import { useRecorder } from "../hooks/useRecorder";
import styles from "./ExercisesPage.module.css";

const exercises = [
  {
    id: "intervals",
    title: "Interval Identification",
    detail: "Listen and identify ascending intervals.",
    premium: false,
  },
  {
    id: "pitch",
    title: "Pitch Accuracy",
    detail: "Sing back the note and check your tuning.",
    premium: true,
  },
];

function ExercisesPage() {
  const { isRecording, start, stop, audioUrl, permissionError } = useRecorder();
  const [feedback, setFeedback] = useState("");

  const handleSend = () => {
    // placeholder feedback
    setFeedback("Analysis: Accuracy 82%. Keep your tempo steady.");
  };

  return (
    <div className="page-shell">
      <div className={styles.header}>
        <h2 className="section-title">Interactive Listening</h2>
        <p className="subtext">
          Start recording, complete the prompt, and get instant feedback.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className={styles.recHeader}>
            <div>
              <div className="pill">Manual Recording</div>
              <h3>Capture your performance</h3>
            </div>
            <div className={styles.indicator} data-active={isRecording}>
              <span className={styles.dot} />
              {isRecording ? "Recording" : "Idle"}
            </div>
          </div>
          <p className="small">
            Press start, play the exercise, then stop to send for AI analysis.
          </p>
          <div className={styles.controls}>
            <button
              className="btn btn-outline"
              onClick={isRecording ? stop : start}
            >
              {isRecording ? "Stop" : "Start Recording"}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={!audioUrl}
            >
              Send to AI
            </button>
          </div>
          {permissionError && (
            <div className="alert alert-error">{permissionError}</div>
          )}
          {audioUrl && (
            <div className={styles.playback}>
              <audio controls src={audioUrl} />
            </div>
          )}
          {feedback && <div className="alert alert-success">{feedback}</div>}
        </div>

        <div className="card">
          <h3>Exercise Library</h3>
          <div className={styles.list}>
            {exercises.map((item) => (
              <div
                key={item.id}
                className={`${styles.exercise} ${item.premium ? styles.locked : ""}`}
              >
                <div>
                  <div className={styles.exerciseTitle}>{item.title}</div>
                  <p className="small">{item.detail}</p>
                </div>
                {item.premium && <span className="pill">Premium</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExercisesPage;
