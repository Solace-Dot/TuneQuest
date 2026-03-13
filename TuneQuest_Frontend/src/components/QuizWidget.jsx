import React, { useState, useEffect } from 'react';
import { requestQuizGeneration, generateQuizFromFunctionCall } from '../api/client';

function QuizWidget({ instrument, skillLevel, quiz, onComplete }) {
  const [userInput, setUserInput] = useState('');
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);

  // If quiz data is passed directly (from QuizPage), use it
  useEffect(() => {
    if (quiz && quiz.questions) {
      setQuestions(quiz.questions);
      setStarted(true);
      setSessionStartedAt(Date.now());
    }
  }, [quiz]);

  const handleQuizRequest = async () => {
    if (!userInput.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Single AI request - detects function call and stops (1 RPM)
      const response = await requestQuizGeneration(userInput);
      
      if (response.function_call) {
        // Function call detected - generate quiz immediately
        const quizData = await generateQuizFromFunctionCall(response.function_call);
        setQuestions(quizData.questions || []);
        setStarted(true);
        setSessionStartedAt(Date.now());
      } else {
        setError('No quiz request detected in your message');
      }
    } catch (err) {
      setError(err.message);
    }
    
    setLoading(false);
  };

  const handleAnswer = (option) => {
    if (selected) return;
    setSelected(option);
    if (option === questions[current].correct_answer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  };

  const resetQuiz = (completionStats = null) => {
    setStarted(false);
    setFinished(false);
    setScore(0);
    setCurrent(0);
    setSelected(null);
    setUserInput('');
    setSessionStartedAt(null);
    if (onComplete) {
      onComplete(completionStats);
    }
  };

  const playEarTrainingCue = async (question) => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state === 'suspended') await ctx.resume();

    const now = ctx.currentTime + 0.05;
    const out = ctx.createGain();
    out.gain.value = 0.08;
    out.connect(ctx.destination);

    const tone = (freq, start, duration, type = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(1.0, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    const meta = question?.audio_meta || null;
    if (meta?.mode === 'interval') {
      const root = meta.root_hz || 220;
      const semitones = meta.semitones || 7;
      tone(root, now, 0.45, meta.waveform || 'sine');
      tone(root * Math.pow(2, semitones / 12), now + 0.55, 0.45, meta.waveform || 'sine');
    } else if (meta?.mode === 'chord_quality') {
      const root = meta.root_hz || 220;
      const third = meta.quality === 'minor' ? 3 : 4;
      const fifth = 7;
      tone(root, now, 0.7, 'triangle');
      tone(root * Math.pow(2, third / 12), now, 0.7, 'triangle');
      tone(root * Math.pow(2, fifth / 12), now, 0.7, 'triangle');
    } else {
      const base = meta?.freq_hz || 220;
      tone(base, now, 0.6, 'sine');
    }

    setTimeout(() => ctx.close(), 2000);
  };

  useEffect(() => {
    if (!started || finished) return;
    const question = questions[current];
    if (!question) return;
    if (!(quiz?.category === 'Ear Training' || question.audio_meta)) return;

    playEarTrainingCue(question).catch(() => {});
  }, [started, finished, current, questions, quiz]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ color: '#f87171', marginBottom: '16px' }}>⚠️ {error}</div>
        <button className="btn btn-outline" onClick={resetQuiz}>Try Again</button>
      </div>
    );
  }

  if (!started && !loading && !quiz) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <textarea
          className="form-control"
          placeholder="Ask for a quiz (e.g., 'Give me a 5-question quiz on guitar chords for beginners')"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          rows="3"
        />
        <button 
          className="btn btn-primary" 
          onClick={handleQuizRequest}
          disabled={!userInput.trim()}
        >
          Request Quiz 🎯
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Processing your request... 🎵</div>;
  }

  if (finished) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{score} / {questions.length}</div>
        <div style={{ marginBottom: '16px' }}>
          {score === questions.length ? '🏆 Perfect score!' : score >= questions.length / 2 ? '🎵 Great job!' : '📚 Keep practicing!'}
        </div>
        <div style={{ fontSize: '12px', opacity: '0.6', marginBottom: '16px' }}>
          Accuracy: {Math.round((score / questions.length) * 100)}%
        </div>
        <button
          className="btn btn-outline"
          onClick={() => {
            const durationSec = sessionStartedAt ? Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000)) : null;
            resetQuiz({
              score,
              total_questions: questions.length,
              accuracy: Math.round((score / Math.max(1, questions.length)) * 100),
              avg_completion_time: durationSec,
            });
          }}
        >
          {quiz ? 'Back to Quizzes' : 'Try Again'}
        </button>
      </div>
    );
  }

  const q = questions[current];
  if (!q) return <div>No questions available</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', opacity: 0.6 }}>
        <span>Question {current + 1} of {questions.length}</span>
        <span>Score: {score}</span>
      </div>

      <div style={{ fontWeight: '600', fontSize: '1rem' }}>{q.question_text}</div>

      {(quiz?.category === 'Ear Training' || q.audio_meta) && (
        <button className="btn btn-outline" onClick={() => playEarTrainingCue(q)}>
          🔊 Play Audio Cue
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {q.options.map(option => {
          let style = { 
            padding: '10px 14px', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
            background: 'transparent', 
            textAlign: 'left', 
            color: 'var(--text)' 
          };

          if (selected) {
            if (option === q.correct_answer) {
              style = { ...style, background: '#1a3a2a', borderColor: '#4ade80', color: '#4ade80' };
            } else if (option === selected) {
              style = { ...style, background: '#3a1a1a', borderColor: '#f87171', color: '#f87171' };
            }
          }

          return (
            <button key={option} style={style} onClick={() => handleAnswer(option)}>
              {option}
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          <div style={{ fontSize: '0.85rem', opacity: 0.7, fontStyle: 'italic' }}>
            💡 {q.explanation}
          </div>
          <button className="btn btn-primary" onClick={handleNext}>
            {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
          </button>
        </>
      )}
    </div>
  );
}

export default QuizWidget;