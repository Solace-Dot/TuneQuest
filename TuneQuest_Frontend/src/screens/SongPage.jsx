import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { completePracticeSession } from "../api/client";
import { updatePracticeStepProgress } from "../redux/slices/aiPlanSlice";
import SongTimelinePlayer from "../components/SongTimelinePlayer";

export default function SongPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const payload = location.state?.songPayload;
  const practiceContext = location.state?.practiceContext || {};

  const handleSongComplete = async (stats) => {
    const stepId = practiceContext?.stepId;
    if (!stepId) return;

    try {
      await completePracticeSession({
        step_id: stepId,
        score: stats?.score,
        accuracy: stats?.accuracy,
        avg_completion_time: stats?.avg_completion_time,
      });
    } catch {
      // Keep local UI progress even if network persistence fails.
    }

    dispatch(updatePracticeStepProgress({
      stepId,
      status: 'Completed',
      best_score: stats?.score,
      accuracy: stats?.accuracy,
      avg_completion_time: stats?.avg_completion_time,
    }));
  };

  const handleFinishSession = () => {
    navigate(-1);
  };

  if (!payload) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎵</div>
        <p>No song loaded. Go back to your Practice Plan and start an exercise.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>
      <SongTimelinePlayer songPayload={payload} onSessionComplete={handleSongComplete} onFinishSession={handleFinishSession} practiceContext={practiceContext} />
    </div>
  );
}
