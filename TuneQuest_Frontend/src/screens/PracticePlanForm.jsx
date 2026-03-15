import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { storePlan, setTokens } from "../redux/slices/aiPlanSlice";
import api from "../api/client";
import styles from "../styles/screens/PracticePlanForm.module.css";

function PracticePlanForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tokensRemaining = useSelector((state) => state.aiPlan.tokensRemaining);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    instrument: "",
    guitarType: "",
    pianoType: "",
    pianoKeys: "",
    violinSize: "",
    voiceType: "",
    hasMetronome: "",
    skillLevel: "",
    learningGoal: "",
    focusAreas: [],
    timeAvailable: "",
    frequency: "",
    frustration: "",
    currentSong: "",
    songMode: ""
  });

  // Fetch token balance once on mount
  useEffect(() => {
    api.get('/api/ai/tokens/')
      .then((res) => dispatch(setTokens({
        tokensRemaining: res.data.tokens_remaining,
        tokensLimit: res.data.tokens_limit
      })))
      .catch(() => {});
  }, [dispatch]);

  // Form options
  const instruments = [
    { key: "Guitar", icon: "🎸", desc: "Acoustic guitar practice path." },
    { key: "Piano", icon: "🎹", desc: "Classical and modern harmony." },
    { key: "Violin", icon: "🎻", desc: "Expressive bowing and melody." },
    { key: "Voice", icon: "🎤", desc: "Pitch, range, and breath control." }
  ];

  const AVAILABLE_INSTRUMENTS = new Set(["Guitar"]);
  const AVAILABLE_GUITAR_TYPES = new Set(["Acoustic"]);
  
  const guitarTypes = ["Acoustic", "Electric", "Classical"];
  const pianoTypes = ["Acoustic Piano", "Digital Piano", "Keyboard"];
  const pianoKeyOptions = ["88 keys (Full)", "76 keys", "61 keys", "49 keys or less"];
  const violinSizes = ["4/4 (Full)", "3/4", "1/2", "1/4"];
  const voiceTypes = ["Soprano", "Alto", "Tenor", "Bass"];
  
  const skillLevels = ["Beginner", "Intermediate"];
  const learningGoals = ["Performance Mastery", "Songwriting & Composition", "Boost Music Theory"];
  const focusOptions = ["Technique", "Rhythm", "Knowledge", "Repertoire", "Ear Training"];
  const timeOptions = [15, 30, 45, 60];
  const frequencyOptions = ["Daily", "3x a week", "Just for today"];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInstrumentChange = (instrument) => {
    if (!AVAILABLE_INSTRUMENTS.has(instrument)) return;
    setFormData(prev => ({
      ...prev,
      instrument: instrument,
      guitarType: "",
      pianoType: "",
      pianoKeys: "",
      violinSize: "",
      voiceType: ""
    }));
  };

  const handleFocusAreaToggle = (area) => {
    const newFocusAreas = formData.focusAreas.includes(area)
      ? formData.focusAreas.filter(f => f !== area)
      : [...formData.focusAreas, area];

    setFormData(prev => ({
      ...prev,
      focusAreas: newFocusAreas
    }));
  };

  // Render instrument-specific questions
  const renderInstrumentSpecificQuestions = () => {
    switch (formData.instrument) {
      case 'Guitar':
        return (
          <div>
            <h4>What type of guitar do you have?</h4>
            <Row className="g-3">
              {guitarTypes.map((type) => (
                <Col key={type} md={4} xs={12}>
                  {(() => {
                    const isAvailable = AVAILABLE_GUITAR_TYPES.has(type);
                    return (
                  <div
                    className={`${styles.card} ${!isAvailable ? styles.unavailable : ""} ${formData.guitarType === type ? styles.selected : ""}`}
                    onClick={() => isAvailable && handleInputChange('guitarType', type)}
                  >
                    <div className={styles.icon}>🎸</div>
                    <div className={styles.title}>{type}</div>
                    {!isAvailable && (
                      <div className={styles.unavailableText}>Not yet available</div>
                    )}
                  </div>
                    );
                  })()}
                </Col>
              ))}
            </Row>
          </div>
        );

      case 'Piano':
        return (
          <>
            <div>
              <h4>What type of piano do you have?</h4>
              <Row className="g-3">
                {pianoTypes.map((type) => (
                  <Col key={type} md={4} xs={12}>
                    <div
                      className={`${styles.card} ${formData.pianoType === type ? styles.selected : ""}`}
                      onClick={() => handleInputChange('pianoType', type)}
                    >
                      <div className={styles.icon}>🎹</div>
                      <div className={styles.title}>{type}</div>
                      <div className={styles.description} style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '8px' }}>
                        {type === 'Acoustic Piano' && 'Traditional piano with strings'}
                        {type === 'Digital Piano' && 'Electronic with weighted keys'}
                        {type === 'Keyboard' && 'Portable electronic keyboard'}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>

            {formData.pianoType && (
              <div style={{ marginTop: '24px' }}>
                <h4>How many keys does your {formData.pianoType.toLowerCase()} have?</h4>
                <Row className="g-3">
                  {pianoKeyOptions.map((option) => (
                    <Col key={option} md={3} xs={6}>
                      <div
                        className={`${styles.card} ${formData.pianoKeys === option ? styles.selected : ""}`}
                        onClick={() => handleInputChange('pianoKeys', option)}
                      >
                        <div className={styles.title}>{option}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            )}
          </>
        );

      case 'Violin':
        return (
          <div>
            <h4>What size violin do you have?</h4>
            <Row className="g-3">
              {violinSizes.map((size) => (
                <Col key={size} md={3} xs={6}>
                  <div
                    className={`${styles.card} ${formData.violinSize === size ? styles.selected : ""}`}
                    onClick={() => handleInputChange('violinSize', size)}
                  >
                    <div className={styles.icon}>🎻</div>
                    <div className={styles.title}>{size}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        );

      case 'Voice':
        return (
          <div>
            <h4>What is your voice type?</h4>
            <Row className="g-3">
              {voiceTypes.map((type) => (
                <Col key={type} md={3} xs={6}>
                  <div
                    className={`${styles.card} ${formData.voiceType === type ? styles.selected : ""}`}
                    onClick={() => handleInputChange('voiceType', type)}
                  >
                    <div className={styles.icon}>🎤</div>
                    <div className={styles.title}>{type}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        );

      default:
        return null;
    }
  };

  // Check if instrument-specific questions are answered
  const isInstrumentInfoComplete = () => {
    switch (formData.instrument) {
      case 'Guitar':
        return formData.guitarType !== "";
      case 'Piano':
        return formData.pianoType !== "" && formData.pianoKeys !== "";
      case 'Violin':
        return formData.violinSize !== "";
      case 'Voice':
        return formData.voiceType !== "";
      default:
        return false;
    }
  };

  const generatePracticePlan = async () => {
    setLoading(true);
    setError(null);

    let instrumentType = "";
    switch (formData.instrument) {
      case 'Guitar': instrumentType = formData.guitarType; break;
      case 'Piano':  instrumentType = formData.pianoType;  break;
      case 'Violin': instrumentType = formData.violinSize; break;
      case 'Voice':  instrumentType = formData.voiceType;  break;
      default: break;
    }

    const practiceData = {
      user_context: {
        instrument: formData.instrument,
        instrument_type: instrumentType,
        piano_keys: formData.pianoKeys || null,
        skill_level: formData.skillLevel,
        has_metronome: formData.hasMetronome === "yes",
      },
      training_goals: {
        primary_path: formData.learningGoal,
        focus_areas: formData.focusAreas,
        current_song: formData.currentSong === 'none' ? null : formData.currentSong || null,
      },
      schedule: {
        time_available_minutes: parseInt(formData.timeAvailable),
        frequency_per_week: formData.frequency === "Daily" ? 7 : formData.frequency === "3x a week" ? 3 : 1,
      },
      pain_points: {
        frustration_text: formData.frustration === 'none' ? null : formData.frustration || null,
      },
    };

    try {
      const response = await api.post('/api/ai/generate-practice-plan/', practiceData);
      const data = response.data;

      dispatch(storePlan({
        plan: data.plan,
        tokensRemaining: data.tokens_remaining,
        skillLevel: formData.skillLevel,
        instrument: formData.instrument,
        learningGoal: formData.learningGoal,
        frequency: formData.frequency,
        planStartDate: new Date().toISOString(),
        recommendedLessonSlugs: data.recommended_lesson_slugs || [],
        dailyPlanId: data.plan_id,
      }));
      navigate('/plan');
    } catch (err) {
      setLoading(false);
      if (err.response?.status === 402) {
        setError("You have no AI tokens remaining. Upgrade to premium for more.");
      } else {
        setError(err.response?.data?.error || "Failed to generate practice plan.");
      }
    }
  };

  return (
    <div className="page-shell">
      <Container>
        <Row className="justify-content-center">
          <Col lg={8} md={10}>
            <div className={styles.page}>
              <div className={styles.header}>
                <div>
                  <h2 className="section-title">
                    Let's get started!
                  </h2>
                  <p className="subtext">
                    Tell us about your musical journey and we'll create a personalized practice plan.
                  </p>
                </div>
                {tokensRemaining !== null && (
                  <div style={{ textAlign: 'right', fontSize: '0.85rem', opacity: 0.8 }}>
                    <span style={{ color: tokensRemaining > 3 ? 'var(--accent)' : 'var(--danger)' }}>
                      🪙 {tokensRemaining} AI {tokensRemaining === 1 ? 'token' : 'tokens'} remaining
                    </span>
                  </div>
                )}
              </div>

              <div className="card">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🎵</div>
                    <div>Creating your personalized practice plan...</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {error && (
                      <div style={{ color: 'var(--danger)', background: 'rgba(255,101,132,0.1)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
                        {error}
                      </div>
                    )}

                    {/* STEP 1: Select Instrument */}
                    <div>
                      <h4>What instrument do you play?</h4>
                      <Row className="g-3">
                        {instruments.map((inst) => (
                          <Col key={inst.key} md={6} lg={3} xs={12}>
                            {(() => {
                              const isAvailable = AVAILABLE_INSTRUMENTS.has(inst.key);
                              return (
                            <div
                                  className={`${styles.card} ${!isAvailable ? styles.unavailable : ""} ${formData.instrument === inst.key ? styles.selected : ""}`}
                                  onClick={() => isAvailable && handleInstrumentChange(inst.key)}
                            >
                              <div className={styles.icon}>{inst.icon}</div>
                              <div className={styles.title}>{inst.key}</div>
                              <div className={styles.description} style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '8px' }}>
                                {inst.desc}
                              </div>
                                  {!isAvailable && (
                                    <div className={styles.unavailableText}>Not yet available</div>
                                  )}
                            </div>
                                  );
                                })()}
                          </Col>
                        ))}
                      </Row>
                    </div>

                    {/* STEP 2: Instrument-Specific Questions */}
                    {formData.instrument && renderInstrumentSpecificQuestions()}

                    {/* STEP 3: Metronome */}
                    {formData.instrument && isInstrumentInfoComplete() && (
                      <div>
                        <h4>Do you have a metronome or backing track?</h4>
                        <Row className="g-3">
                          {["Yes", "No"].map((option) => (
                            <Col key={option} md={6} xs={12}>
                              <div
                                className={`${styles.card} ${formData.hasMetronome === option.toLowerCase() ? styles.selected : ""}`}
                                onClick={() => handleInputChange('hasMetronome', option.toLowerCase())}
                              >
                                <div className={styles.title}>{option}</div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    {/* STEP 4: Skill Level */}
                    {formData.hasMetronome && (
                      <div>
                        <h4>Select Your Skill Level</h4>
                        <Row className="g-3">
                          {skillLevels.map((level) => (
                            <Col key={level} md={6} xs={12}>
                              <div
                                className={`${styles.card} ${formData.skillLevel === level ? styles.selected : ""}`}
                                onClick={() => handleInputChange('skillLevel', level)}
                              >
                                <div className={styles.title}>{level}</div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    {/* STEP 5: Learning Goal */}
                    {formData.skillLevel && (
                      <div>
                        <h4>What's Your Learning Goal?</h4>
                        <Row className="g-3">
                          {learningGoals.map((goal) => (
                            <Col key={goal} md={4} xs={12}>
                              <div
                                className={`${styles.card} ${formData.learningGoal === goal ? styles.selected : ""}`}
                                onClick={() => handleInputChange('learningGoal', goal)}
                              >
                                <div className={styles.title} style={{ fontSize: '0.9rem' }}>{goal}</div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    {/* STEP 6: Focus Areas */}
                    {formData.learningGoal && (
                      <div>
                        <h4>What do you want to focus on? (Select multiple)</h4>
                        <Row className="g-3">
                          {focusOptions.map((focus) => (
                            <Col key={focus} md={6} lg={4} xs={12}>
                              <div
                                className={`${styles.card} ${formData.focusAreas.includes(focus) ? styles.selected : ""}`}
                                onClick={() => handleFocusAreaToggle(focus)}
                              >
                                <div className={styles.title}>{focus}</div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    {/* STEP 7: Time Available */}
                    {formData.focusAreas.length > 0 && (
                      <div>
                        <h4>How much time do you have today?</h4>
                        <Row className="g-3">
                          {timeOptions.map((time) => (
                            <Col key={time} md={3} xs={6}>
                              <div
                                className={`${styles.card} ${formData.timeAvailable === time.toString() ? styles.selected : ""}`}
                                onClick={() => handleInputChange('timeAvailable', time.toString())}
                              >
                                <div className={styles.title}>{time} min</div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    {/* STEP 8: Frequency */}
                    {formData.timeAvailable && (
                      <div>
                        <h4>How often will you practice?</h4>
                        <Row className="g-3">
                          {frequencyOptions.map((freq) => (
                            <Col key={freq} md={4} xs={12}>
                              <div
                                className={`${styles.card} ${formData.frequency === freq ? styles.selected : ""}`}
                                onClick={() => handleInputChange('frequency', freq)}
                              >
                                <div className={styles.title}>{freq}</div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    {/* STEP 9: Frustration */}
                    {formData.frequency && (
                      <div>
                        <h4>What is currently frustrating you? (Optional)</h4>
                        <Row className="g-3">
                          <Col md={4} xs={12}>
                            <div
                              className={`${styles.card} ${formData.frustration === 'none' ? styles.selected : ""}`}
                              onClick={() => handleInputChange('frustration', 'none')}
                            >
                              <div className={styles.title}>None</div>
                            </div>
                          </Col>
                          <Col md={8} xs={12}>
                            <textarea
                              className="form-control"
                              rows="3"
                              placeholder={
                                formData.instrument === 'Piano' 
                                  ? "e.g., My left hand can't keep up with my right hand..."
                                  : formData.instrument === 'Violin'
                                  ? "e.g., My bow keeps squeaking on the strings..."
                                  : formData.instrument === 'Voice'
                                  ? "e.g., I can't hit high notes without straining..."
                                  : "e.g., My pinky finger feels weak or I can't switch chords fast enough..."
                              }
                              value={formData.frustration === 'none' ? '' : formData.frustration}
                              onChange={(e) => handleInputChange('frustration', e.target.value)}
                            />
                          </Col>
                        </Row>
                      </div>
                    )}

                    {/* STEP 10: Current Song */}
                    {(formData.frustration || formData.frustration === 'none') && (
                      <div>
                        <h4>Current Song/Piece you are working on? (Optional)</h4>

                        {/* Mode picker */}
                        <Row className="g-3" style={{ marginBottom: '12px' }}>
                          <Col xs={6}>
                            <div
                              className={`${styles.card} ${formData.songMode === 'none' ? styles.selected : ''}`}
                              onClick={() => { handleInputChange('currentSong', 'none'); handleInputChange('songMode', 'none'); }}
                              style={{ textAlign: 'center' }}
                            >
                              <div className={styles.title}>🚫 None</div>
                              <div className={styles.subtitle}>Skip this step</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div
                              className={`${styles.card} ${formData.songMode === 'library' ? styles.selected : ''}`}
                              onClick={() => { handleInputChange('songMode', 'library'); handleInputChange('currentSong', ''); }}
                              style={{ textAlign: 'center' }}
                            >
                              <div className={styles.title}>📚 The Library</div>
                              <div className={styles.subtitle}>Verified classics</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div
                              className={`${styles.card} ${formData.songMode === 'composer' ? styles.selected : ''}`}
                              onClick={() => { handleInputChange('songMode', 'composer'); handleInputChange('currentSong', ''); }}
                              style={{ textAlign: 'center' }}
                            >
                              <div className={styles.title}>🤖 AI Composer</div>
                              <div className={styles.subtitle}>Any song, AI-arranged</div>
                            </div>
                          </Col>
                        </Row>

                        {/* Library dropdown */}
                        {formData.songMode === 'library' && (
                          <select
                            className={styles.songSelect}
                            value={formData.currentSong}
                            onChange={(e) => handleInputChange('currentSong', e.target.value)}
                          >
                            <option value="">-- Choose a verified classic --</option>
                            {[
                              { title: 'Ode to Joy', composer: 'Beethoven' },
                              { title: 'Twinkle Twinkle Little Star', composer: 'Traditional' },
                              { title: 'Mary Had a Little Lamb', composer: 'Traditional' },
                              { title: 'Happy Birthday', composer: 'Traditional' },
                              { title: 'Greensleeves', composer: 'Traditional' },
                              { title: 'Amazing Grace', composer: 'Traditional' },
                              { title: 'House of the Rising Sun', composer: 'The Animals' },
                              { title: 'Smoke on the Water', composer: 'Deep Purple' },
                              { title: 'Seven Nation Army', composer: 'The White Stripes' },
                              { title: 'Wonderwall', composer: 'Oasis' },
                              { title: "Knockin' on Heaven's Door", composer: 'Bob Dylan' },
                              { title: 'Blackbird', composer: 'The Beatles' },
                              { title: 'Yesterday', composer: 'The Beatles' },
                              { title: 'Hallelujah', composer: 'Leonard Cohen' },
                              { title: 'Wish You Were Here', composer: 'Pink Floyd' },
                              { title: 'Nothing Else Matters', composer: 'Metallica' },
                              { title: 'Tears in Heaven', composer: 'Eric Clapton' },
                            ].map((s) => (
                              <option key={s.title} value={s.title}>
                                {s.title} · {s.composer}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* AI Composer free-text input */}
                        {formData.songMode === 'composer' && (
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g., Breathe – Pink Floyd, Stairway to Heaven..."
                            value={formData.currentSong === 'none' ? '' : formData.currentSong}
                            onChange={(e) => handleInputChange('currentSong', e.target.value)}
                          />
                        )}
                      </div>
                    )}

                    {/* Submit Button */}
                    {(formData.frustration || formData.frustration === 'none') && (
                      <div className={styles.footer}>
    
                        <button
                          className="btn btn-primary"
                          onClick={generatePracticePlan}
                          disabled={!isInstrumentInfoComplete() || !formData.skillLevel || !formData.learningGoal || formData.focusAreas.length === 0}
                        >
                          🎵 Generate Practice Plan
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default PracticePlanForm;