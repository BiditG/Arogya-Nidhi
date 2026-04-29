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
  const [results, setResults] = useState([]); // {id, selected, correct}

  // Filters / options
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

  // Quiz controls
  const [mode, setMode] = useState("casual"); // casual | exam
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

  useEffect(() => {
    setTimeLeft(timerPerQuestion);
  }, [timerPerQuestion]);

  useEffect(() => {
    if (quizStarted && timed) {
      clearInterval(timerRef.current);
      setTimeLeft(timerPerQuestion);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [quizStarted, timed, current]);

  useEffect(() => {
    if (timeLeft <= 0 && quizStarted && timed) {
      handleTimeExpired();
    }
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
        setCurrent(0);
        setScore(0);
        setResults([]);
      } else {
        setAllQuestions(sampleQuestions);
        setQuestions(sampleQuestions);
      }
    } catch (err) {
      console.error(err);
      setAllQuestions(sampleQuestions);
      setQuestions(sampleQuestions);
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
    const load = async () => {
      await fetchMetadata();
      if (mounted) await fetchFromBackend();
    };
    load();
    return () => { mounted = false; };
  }, [tableName]);

  // Animated counter for available questions
  useEffect(() => {
    if (availableCount === null) {
      setDisplayCount(0);
      return;
    }
    const to = Number(availableCount) || 0;
    const duration = 800; // ms
    let start = null;
    let raf = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const val = Math.floor(progress * to);
      setDisplayCount(val);
      if (progress < 1) raf = requestAnimationFrame(step);
      else setDisplayCount(to);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [availableCount]);

  // Re-fetch questions when the user changes filters or number of questions
  useEffect(() => {
    let mounted = true;
    const refetch = async () => {
      if (mounted) await fetchFromBackend();
    };
    refetch();
    return () => { mounted = false; };
  }, [filterSubject, filterTopic, filterYear, numQuestions, tableName]);

  const navigate = useNavigate();

  const startQuiz = async () => {
    // navigate to dedicated quiz page, passing selected filters and mode
    navigate('/students/quiz', {
      state: {
        tableName,
        filterSubject,
        filterTopic,
        filterYear,
        numQuestions,
        mode,
        timed,
        timerPerQuestion,
      }
    });
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
    // record progress to backend
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
      // reveal immediately, don't advance until user presses Next
      setShowAnswer(true);
      // record result now
      const q = questions[current];
      const correct = selected === q.answer;
      setResults((r) => [...r, { id: q.id, selected, correct }]);
      if (correct) setScore((s) => s + 1);
      const timeTaken = Math.floor((Date.now() - (questionStartRef.current || Date.now())) / 1000);
      sendProgress(q.id, selected === null ? null : String(selected), Boolean(correct), timeTaken).catch(() => {});
    } else {
      // exam mode: record and advance without revealing
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
    // treat as no answer (incorrect) and advance
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


  const revealAll = () => {
    setShowAnswer(true);
    setFinished(true);
    setQuizStarted(false);
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-50 to-sky-50 flex items-center justify-center shadow-inner">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-indigo-600">{displayCount}</div>
              <div className="text-xs text-gray-400">available</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">MCQ Practice</h3>
            <p className="text-sm text-gray-500">Quick practice rounds — minimal UI for focused learning.</p>
            <div className="mt-2 text-sm text-gray-400">{metaLoading ? 'Loading metadata…' : `${availableCount ?? '—'} total questions`}</div>
          </div>
        </div>

          <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
            <label className="text-xs text-gray-500">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="bg-transparent text-sm">
              <option value="casual">Casual</option>
              <option value="exam">Exam</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
            <label className="text-xs text-gray-500">Qty</label>
            <input type="number" min={1} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="w-16 bg-transparent text-sm text-right" />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-200 transition-all" style={{ width: `${availableCount ? Math.min(100, Math.round((numQuestions / (availableCount || 1)) * 100)) : 0}%` }} />
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded">{questions && questions.length ? (
        <div className="text-sm text-gray-700">Ready: {questions.length} questions loaded.</div>
      ) : (
        <div className="text-sm text-gray-500">No preview questions available.</div>
      )}</div>

      {/* Quiz view */}
      {questions && questions.length > 0 && (
        <div className="mt-6 p-4 bg-white rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-500">Question {current + 1} / {questions.length}</div>
            <div className="text-sm text-gray-500">Score: {score}</div>
          </div>

          <div className="mb-4">
            <div className="text-lg font-medium text-gray-800">{questions[current].question}</div>
            {timed && quizStarted && (
              <div className="text-sm text-red-500 mt-2">Time left: {timeLeft}s</div>
            )}
          </div>

          <div className="grid gap-2">
            {questions[current].options && questions[current].options.length ? (
              questions[current].options.map((opt, idx) => {
                const isSelected = selected === idx;
                const isCorrect = showAnswer && idx === questions[current].answer;
                const isWrongPick = showAnswer && isSelected && idx !== questions[current].answer;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelected(idx)}
                    className={`w-full text-left px-4 py-2 rounded-md border ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'} ${isCorrect ? 'border-green-600 bg-green-50' : ''} ${isWrongPick ? 'border-red-600 bg-red-50' : ''}`}
                    disabled={showAnswer || finished}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-xs font-medium">{String.fromCharCode(65 + idx)}</div>
                      <div className="text-sm text-gray-700">{typeof opt === 'string' ? opt : (opt && (opt.text ?? opt.label ?? opt.value)) || JSON.stringify(opt)}</div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-sm text-gray-500">No options provided for this question.</div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            {!quizStarted && !finished && (
              <button onClick={() => { setQuizStarted(true); setCurrent(0); setScore(0); setResults([]); }} className="px-3 py-2 bg-indigo-600 text-white rounded-md">Begin</button>
            )}

            {quizStarted && !finished && (
              <>
                <button onClick={submitAnswer} className="px-3 py-2 bg-indigo-600 text-white rounded-md" disabled={selected === null}>Submit</button>
                {mode === 'casual' && <button onClick={nextQuestion} className="px-3 py-2 bg-gray-100 rounded-md">Next</button>}
              </>
            )}

            {finished && (
              <div className="text-sm text-gray-700">Final score: {score} / {questions.length}</div>
            )}

            <div className="ml-auto text-sm text-gray-400">{showAnswer ? 'Answer shown' : ''}</div>
          </div>

          {showAnswer && (
            <div className="mt-4 text-sm text-gray-600">
              <div><strong>Explanation:</strong> {questions[current].explanation || '—'}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MCQSection;
