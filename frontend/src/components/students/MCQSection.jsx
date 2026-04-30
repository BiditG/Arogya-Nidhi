import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const sampleQuestions = [
  {
    id: "q1",
    question: "Which organ produces insulin?",
    options: ["Liver", "Pancreas", "Kidney", "Spleen"],
    answer: 1,
    explanation: "Pancreas secretes insulin from beta cells.",
  },
  {
    id: "q2",
    question: "What is the normal resting heart rate range (adult)?",
    options: ["30-50 bpm", "60-100 bpm", "100-140 bpm", "140-180 bpm"],
    answer: 1,
    explanation: "Normal adult resting heart rate is commonly 60-100 bpm.",
  },
];

const MCQSection = () => {
  const [allQuestions, setAllQuestions] = useState(sampleQuestions);
  const [questions, setQuestions] = useState(sampleQuestions);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState([]);

  const [tableName, setTableName] = useState("mcq_questions");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [years, setYears] = useState([]);
  const [availableCount, setAvailableCount] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);

  const [mode, setMode] = useState("casual");
  const [timed, setTimed] = useState(false);
  const [timerPerQuestion, setTimerPerQuestion] = useState(30);
  const [timeLeft, setTimeLeft] = useState(timerPerQuestion);
  const [quizStarted, setQuizStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const timerRef = useRef(null);
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    setSelected(null);
    setShowAnswer(false);
    questionStartRef.current = Date.now();
  }, [current]);

  const sendProgress = async (mcqId, selectedOption, isCorrect, timeTakenSeconds) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      await fetch('/api/students/progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mcq_id: mcqId, selected_option: selectedOption, is_correct: Boolean(isCorrect), time_taken_seconds: timeTakenSeconds }),
      });
    } catch (err) {
      console.error('Failed to send progress', err);
    }
  };

  useEffect(() => { setTimeLeft(timerPerQuestion); }, [timerPerQuestion]);

  useEffect(() => {
    if (quizStarted && timed) {
      clearInterval(timerRef.current);
      setTimeLeft(timerPerQuestion);
      timerRef.current = setInterval(() => { setTimeLeft((t) => t - 1); }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [quizStarted, timed, current]);

  useEffect(() => {
    if (timeLeft <= 0 && quizStarted && timed) handleTimeExpired();
  }, [timeLeft, quizStarted, timed]);

  const buildFilterQuery = () => {
    const params = new URLSearchParams();
    if (filterSubject.trim()) params.set("subject", filterSubject.trim());
    if (filterTopic.trim()) params.set("topic", filterTopic.trim());
    if (filterYear.trim()) params.set("year", filterYear.trim());
    if (numQuestions) params.set("limit", String(numQuestions));
    if (tableName) params.set("table", tableName);
    return params.toString() ? `?${params.toString()}` : "";
  };

  const fetchFromBackend = async () => {
    setLoading(true);
    try {
      const q = buildFilterQuery();
      const res = await fetch(`/api/students/mcqs${q}`);
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const payload = await res.json();
      if (payload.success) {
        const mapped = payload.data.map((r) => ({
          id: r.id,
          question: r.question,
          options: r.options || [],
          answer: typeof r.answer === "number" ? r.answer : Number(r.answer || 0),
          explanation: r.explanation || "",
          meta: { exam: r.exam, subject: r.subject, topic: r.topic, year: r.year, created_at: r.created_at },
        }));
        setAllQuestions(mapped.length ? mapped : sampleQuestions);
        setQuestions(mapped.length ? mapped : sampleQuestions);
        setCurrent(0); setScore(0); setResults([]);
      } else {
        setAllQuestions(sampleQuestions); setQuestions(sampleQuestions);
      }
    } catch (err) {
      console.error(err);
      setAllQuestions(sampleQuestions); setQuestions(sampleQuestions);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    setMetaLoading(true);
    try {
      const res = await fetch(`/api/students/metadata?table=${encodeURIComponent(tableName)}`);
      if (!res.ok) return;
      const payload = await res.json();
      if (payload.success && payload.data) {
        setSubjects(payload.data.subjects || []);
        setTopics(payload.data.topics || []);
        setYears(payload.data.years || []);
        setAvailableCount(payload.data.total ?? null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => { await fetchMetadata(); if (mounted) await fetchFromBackend(); };
    load();
    return () => { mounted = false; };
  }, [tableName]);

  useEffect(() => {
    if (availableCount === null) { setDisplayCount(0); return; }
    const to = Number(availableCount) || 0;
    const duration = 800;
    let start = null;
    let raf = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayCount(Math.floor(progress * to));
      if (progress < 1) raf = requestAnimationFrame(step);
      else setDisplayCount(to);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [availableCount]);

  useEffect(() => {
    let mounted = true;
    const refetch = async () => { if (mounted) await fetchFromBackend(); };
    refetch();
    return () => { mounted = false; };
  }, [filterSubject, filterTopic, filterYear, numQuestions, tableName]);

  const navigate = useNavigate();

  const startQuiz = async () => {
    navigate('/students/quiz', { state: { tableName, filterSubject, filterTopic, filterYear, numQuestions, mode, timed, timerPerQuestion } });
  };

  const finishQuiz = () => {
    setQuizStarted(false);
    setFinished(true);
    clearInterval(timerRef.current);
    setShowAnswer(true);
  };

  const recordAndAdvance = (sel) => {
    const q = questions[current];
    const correct = sel === q.answer;
    setResults((r) => [...r, { id: q.id, selected: sel, correct }]);
    if (correct) setScore((s) => s + 1);
    const timeTaken = Math.floor((Date.now() - (questionStartRef.current || Date.now())) / 1000);
    sendProgress(q.id, sel === null ? null : String(sel), Boolean(correct), timeTaken).catch(() => {});
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowAnswer(false);
      setTimeLeft(timerPerQuestion);
    } else {
      finishQuiz();
    }
  };

  const submitAnswer = () => {
    if (selected === null) return;
    if (mode === "casual") {
      setShowAnswer(true);
      const q = questions[current];
      const correct = selected === q.answer;
      setResults((r) => [...r, { id: q.id, selected, correct }]);
      if (correct) setScore((s) => s + 1);
      const timeTaken = Math.floor((Date.now() - (questionStartRef.current || Date.now())) / 1000);
      sendProgress(q.id, selected === null ? null : String(selected), Boolean(correct), timeTaken).catch(() => {});
    } else {
      recordAndAdvance(selected);
    }
  };

  const nextQuestion = () => {
    if (mode === "casual") {
      if (current < questions.length - 1) {
        setCurrent((c) => c + 1);
        setSelected(null);
        setShowAnswer(false);
        setTimeLeft(timerPerQuestion);
      } else {
        finishQuiz();
      }
    }
  };

  const handleTimeExpired = () => {
    setResults((r) => [...r, { id: questions[current].id, selected: null, correct: false }]);
    const qid = questions[current].id;
    const timeTaken = Math.floor((Date.now() - (questionStartRef.current || Date.now())) / 1000);
    sendProgress(qid, null, false, timeTaken).catch(() => {});
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowAnswer(false);
      setTimeLeft(timerPerQuestion);
    } else {
      finishQuiz();
    }
  };

  const revealAll = () => { setShowAnswer(true); setFinished(true); setQuizStarted(false); };

  return (
    <div className="sp-panel">
      {/* Header row: counter + controls */}
      <div className="sp-row-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="sp-row">
          <div className="sp-mcq-counter">
            <span className="sp-mcq-counter-value">{displayCount}</span>
            <span className="sp-mcq-counter-label">available</span>
          </div>
          <div>
            <div className="sp-section-title" style={{ marginBottom: '0.25rem' }}>MCQ Practice</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--pp-text-secondary)' }}>
              Focused practice rounds for medical students.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-muted)', marginTop: '0.25rem' }}>
              {metaLoading ? 'Loading metadata…' : `${availableCount ?? '—'} total questions`}
            </div>
          </div>
        </div>

        <div className="sp-row" style={{ flexWrap: 'wrap' }}>
          <div className="sp-control-group">
            <span className="sp-control-label">Mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="sp-control-select"
            >
              <option value="casual">Casual</option>
              <option value="exam">Exam</option>
            </select>
          </div>

          <div className="sp-control-group">
            <span className="sp-control-label">Qty</span>
            <input
              type="number"
              min={1}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="sp-control-input"
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="sp-mcq-progress">
        <div
          className="sp-mcq-progress-fill"
          style={{ width: `${availableCount ? Math.min(100, Math.round((numQuestions / (availableCount || 1)) * 100)) : 0}%` }}
        />
      </div>

      {/* Loaded status */}
      <div className="sp-mcq-status">
        {questions && questions.length
          ? `Ready: ${questions.length} questions loaded.`
          : 'No preview questions available.'}
      </div>

      {/* Quiz view */}
      {questions && questions.length > 0 && (
        <div className="sp-mcq-question-card">
          <div className="sp-mcq-meta">
            <span>Question {current + 1} / {questions.length}</span>
            <span className="sp-mcq-score">Score: {score}</span>
          </div>

          <div className="sp-mcq-question">{questions[current].question}</div>

          {timed && quizStarted && (
            <div className="sp-mcq-timer">Time left: {timeLeft}s</div>
          )}

          <div className="sp-mcq-options">
            {questions[current].options && questions[current].options.length ? (
              questions[current].options.map((opt, idx) => {
                const isSelected = selected === idx;
                const isCorrect = showAnswer && idx === questions[current].answer;
                const isWrongPick = showAnswer && isSelected && idx !== questions[current].answer;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelected(idx)}
                    className={`sp-mcq-option${isSelected ? ' selected' : ''}${isCorrect ? ' correct' : ''}${isWrongPick ? ' wrong' : ''}`}
                    disabled={showAnswer || finished}
                  >
                    <span className="sp-mcq-option-badge">{String.fromCharCode(65 + idx)}</span>
                    <span>{typeof opt === 'string' ? opt : (opt && (opt.text ?? opt.label ?? opt.value)) || JSON.stringify(opt)}</span>
                  </button>
                );
              })
            ) : (
              <div style={{ fontSize: '0.875rem', color: 'var(--pp-text-muted)' }}>No options provided for this question.</div>
            )}
          </div>

          <div className="sp-mcq-actions">
            {!quizStarted && !finished && (
              <button
                onClick={() => { setQuizStarted(true); setCurrent(0); setScore(0); setResults([]); }}
                className="sp-btn-primary"
              >
                Begin
              </button>
            )}

            {quizStarted && !finished && (
              <>
                <button onClick={submitAnswer} className="sp-btn-primary" disabled={selected === null}>Submit</button>
                {mode === 'casual' && (
                  <button onClick={nextQuestion} className="sp-btn-secondary">Next</button>
                )}
              </>
            )}

            {finished && (
              <div className="sp-mcq-result">
                Final score: <strong>{score} / {questions.length}</strong>
              </div>
            )}

            {showAnswer && (
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--pp-text-muted)' }}>
                Answer shown
              </span>
            )}
          </div>

          {showAnswer && (
            <div className="sp-explanation">
              <strong>Explanation:</strong> {questions[current].explanation || '—'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MCQSection;
