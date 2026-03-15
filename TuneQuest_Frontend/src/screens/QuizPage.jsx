import React, { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import styles from "../styles/screens/QuizPage.module.css";

const quizQuestions = [
  {
    id: "mc1",
    type: "multiple",
    question:
      "Which chord quality contains a minor third and diminished fifth?",
    options: ["Major", "Minor", "Diminished", "Augmented"],
    answer: "Diminished",
  },
  {
    id: "listen1",
    type: "listening",
    question: "Identify the interval you hear.",
    options: ["Perfect Fifth", "Major Third", "Minor Sixth", "Major Second"],
    answer: "Major Third",
  },
];

function QuizPage() {
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChoice = (id, option) =>
    setResponses({ ...responses, [id]: option });

  const handleSubmit = () => setSubmitted(true);

  return (
    <div className="page-shell">
      <Container>
        <h2 className="section-title">Skill Quizzes</h2>
        <p className="subtext">
          Immediate feedback for theory and listening skills.
        </p>
        <Row className="g-4">
          <Col lg={8} md={12}>
            <div className={styles.list}>
              {quizQuestions.map((q) => {
                const userAnswer = responses[q.id];
                const isCorrect = submitted && userAnswer === q.answer;
                const isIncorrect =
                  submitted && userAnswer && userAnswer !== q.answer;
                return (
                  <div key={q.id} className="card">
                    <div className={styles.qHeader}>
                      <div className="pill tag-muted">
                        {q.type === "multiple" ? "Multiple Choice" : "Listening"}
                      </div>
                      {submitted && (
                        <div
                          className={
                            isCorrect ? "alert alert-success" : "alert alert-error"
                          }
                        >
                          {isCorrect ? "Correct" : "Incorrect"}
                        </div>
                      )}
                    </div>
                    <h3 className={styles.question}>{q.question}</h3>
                    <div className={styles.options}>
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          className={styles.option}
                          data-selected={userAnswer === opt}
                          onClick={() => handleChoice(q.id, opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {isIncorrect && <div className="small">Answer: {q.answer}</div>}
                  </div>
                );
              })}
            </div>
          </Col>
        </Row>
        <Row className="mt-4">
          <Col>
            <button className="btn btn-primary" onClick={handleSubmit}>
              Submit Answers
            </button>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default QuizPage;
