import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ArrowPathIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  EyeIcon,
  LightBulbIcon,
  PaperAirplaneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { AppContext } from "../../context/AppContext";

const LOCAL_FALLBACK_CASES = [
  {
    id: "local_case_headache_fever",
    title: "Headache and fever",
    patientIntro: "I have had a severe headache and fever for two days. I feel tired and slightly nauseous.",
    patientFacts: {
      age: "19",
      sex: "male",
      chiefComplaint: "Headache and fever",
      duration: "2 days",
      onset: "gradual",
      severity: "6/10",
      associatedSymptoms: ["fatigue", "nausea"],
      negatives: ["no stiff neck", "no rash"],
      medications: ["paracetamol once"],
      allergies: ["none known"],
      pastHistory: ["no major illnesses"],
      familyHistory: ["non-contributory"],
      socialHistory: ["non-smoker"],
    },
    diagnosis: "Viral upper respiratory infection",
    explanation: "Acute fever, headache, fatigue, and nausea without red flags can fit a viral illness. Meningitis and other urgent causes should be considered if neck stiffness, confusion, rash, or persistent high fever appear.",
    difficulty: "easy",
    specialty: "general",
  },
  {
    id: "local_case_cough_wheeze",
    title: "Night cough and wheeze",
    patientIntro: "I keep waking up coughing at night, and sometimes I hear a whistling sound when I breathe.",
    patientFacts: {
      age: "17",
      sex: "female",
      chiefComplaint: "Night cough and wheeze",
      duration: "1 month",
      onset: "intermittent, worse at night and after exercise",
      severity: "5/10 during episodes",
      associatedSymptoms: ["chest tightness", "shortness of breath with running"],
      negatives: ["no fever", "no sputum", "no chest pain"],
      medications: ["occasional cough syrup"],
      allergies: ["dust allergy"],
      pastHistory: ["eczema in childhood"],
      familyHistory: ["mother has asthma"],
      socialHistory: ["non-smoker"],
    },
    diagnosis: "Bronchial asthma",
    explanation: "Nocturnal cough, episodic wheeze, exercise trigger, and atopic history are consistent with asthma. Spirometry helps confirm it.",
    difficulty: "medium",
    specialty: "respiratory",
  },
];

const QUICK_QUESTIONS = [
  "How old are you?",
  "How long has this been happening?",
  "Can you rate the severity?",
  "Do you have any other symptoms?",
  "Are you taking any medicines?",
  "Any allergies or past illnesses?",
];

const messageId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

const pickLocalCase = (excludeId = "") => {
  const pool = LOCAL_FALLBACK_CASES.length > 1
    ? LOCAL_FALLBACK_CASES.filter((caseData) => caseData.id !== excludeId)
    : LOCAL_FALLBACK_CASES;
  const base = pool[Math.floor(Math.random() * pool.length)] || LOCAL_FALLBACK_CASES[0];
  return {
    ...base,
    id: `${base.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sourceId: base.id,
    patientFacts: { ...base.patientFacts },
  };
};

const listText = (value, fallback = "I am not sure") => {
  if (Array.isArray(value) && value.length) return value.join(", ");
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
};

const localPatientReply = (caseData, questionText) => {
  const facts = caseData?.patientFacts || {};
  const question = String(questionText || "").toLowerCase();

  if (!question) return caseData?.patientIntro || "I am not feeling well.";
  if (["diagnosis", "diagnose", "what do i have", "condition"].some((term) => question.includes(term))) {
    return "I do not know what it is. That is why I came to you.";
  }
  if (question.includes("age") || question.includes("old")) return `I am ${facts.age || "not sure"} years old.`;
  if (question.includes("gender") || question.includes("sex")) return `I am ${facts.sex || "not sure"}.`;
  if (question.includes("how long") || question.includes("when") || question.includes("duration")) {
    return `It has been going on for ${facts.duration || "a while"}. ${facts.onset ? `It started ${facts.onset}.` : ""}`.trim();
  }
  if (question.includes("severe") || question.includes("severity") || question.includes("scale") || question.includes("bad")) {
    return `I would rate it around ${facts.severity || "moderate"}.`;
  }
  if (question.includes("medicine") || question.includes("medication") || question.includes("taking")) {
    return `I am taking ${listText(facts.medications, "no regular medicines")}.`;
  }
  if (question.includes("allerg")) return `My allergies are ${listText(facts.allergies, "none that I know of")}.`;
  if (question.includes("past") || question.includes("history") || question.includes("illness")) {
    return `My past history is ${listText(facts.pastHistory, "not significant")}.`;
  }
  if (question.includes("family")) return `Family history: ${listText(facts.familyHistory, "nothing important comes to mind")}.`;
  if (question.includes("smoke") || question.includes("social") || question.includes("work")) {
    return `Social history: ${listText(facts.socialHistory, "nothing special")}.`;
  }
  if (question.includes("test") || question.includes("lab") || question.includes("scan") || question.includes("x-ray")) {
    return "I have not had any tests done yet.";
  }

  return `I have noticed ${listText(facts.associatedSymptoms, "the main symptom I mentioned")}. I have not had ${listText(facts.negatives, "anything else specific")}.`;
};

const makeReveal = (caseData) => {
  const diagnosis = caseData?.diagnosis || "Diagnosis not available";
  const explanation = caseData?.explanation || "Review the clinical pattern and compare it with the differentials.";
  return `Diagnosis: ${diagnosis}\n\n${explanation}`;
};

const DiagnosticLab = () => {
  const { backendUrl } = useContext(AppContext);
  const [messages, setMessages] = useState([
    {
      id: messageId(),
      role: "instructor",
      text: "Preparing your first patient case...",
    },
  ]);
  const [input, setInput] = useState("");
  const [activeCase, setActiveCase] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [specialty, setSpecialty] = useState("");
  const [diagnosisGuess, setDiagnosisGuess] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [caseLoading, setCaseLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const autoStartedRef = useRef(false);
  const lastLocalCaseRef = useRef("");
  const messagesRef = useRef(null);

  const apiBase = useMemo(() => `${backendUrl}/api/ai/diagnostic`, [backendUrl]);

  const pushMessage = (role, text) => {
    setMessages((prev) => [...prev, { id: messageId(), role, text }]);
  };

  const startConversation = (caseData) => {
    setActiveCase(caseData);
    setMessages([
      {
        id: messageId(),
        role: "instructor",
        text: `Case loaded: ${caseData.title || "Diagnostic case"}.`,
      },
      {
        id: messageId(),
        role: "patient",
        text: caseData.patientIntro || "I am not feeling well.",
      },
    ]);
    setInput("");
    setDiagnosisGuess("");
    setEvaluation(null);
    setRevealed(false);
  };

  const loadCase = async () => {
    setCaseLoading(true);
    setEvaluation(null);
    setRevealed(false);

    try {
      const { data } = await axios.post(`${apiBase}/case`, {
        difficulty,
        specialty: specialty.trim() || undefined,
      });

      const nextCase = data?.data || pickLocalCase(lastLocalCaseRef.current);
      if (nextCase.sourceId) lastLocalCaseRef.current = nextCase.sourceId;
      startConversation(nextCase);
    } catch (error) {
      const nextCase = pickLocalCase(lastLocalCaseRef.current);
      lastLocalCaseRef.current = nextCase.sourceId;
      startConversation(nextCase);
      toast.info("Using a local sample case because the AI case service is unavailable.");
    } finally {
      setCaseLoading(false);
    }
  };

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    loadCase();
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (rawText = input) => {
    const text = String(rawText || "").trim();
    if (!text || sending) return;

    if (!activeCase) {
      pushMessage("instructor", "Start a case first.");
      return;
    }

    const studentMessage = { id: messageId(), role: "student", text };
    const nextMessages = [...messages, studentMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const { data } = await axios.post(`${apiBase}/reply`, {
        case: activeCase,
        messages: nextMessages.map((message) => ({
          role: message.role === "instructor" ? "system" : message.role,
          text: message.text,
        })),
      });

      pushMessage("patient", data?.reply || localPatientReply(activeCase, text));
    } catch (error) {
      pushMessage("patient", localPatientReply(activeCase, text));
    } finally {
      setSending(false);
    }
  };

  const submitDiagnosis = async () => {
    const guess = diagnosisGuess.trim();
    if (!guess || !activeCase || checking) return;

    setChecking(true);
    try {
      const { data } = await axios.post(`${apiBase}/evaluate`, {
        case: activeCase,
        guess,
      });

      const result = data?.result || null;
      setEvaluation(result);
      if (result?.feedback) pushMessage("instructor", result.feedback);
    } catch (error) {
      const answer = String(activeCase.diagnosis || "").toLowerCase();
      const correct = answer && (guess.toLowerCase().includes(answer) || answer.includes(guess.toLowerCase()));
      const fallback = {
        correct,
        closeness: correct ? "exact" : "incorrect",
        feedback: correct
          ? "Good work. Your diagnosis matches this case."
          : "Not quite. Keep collecting details, then compare the timing, associated symptoms, and red flags.",
      };
      setEvaluation(fallback);
      pushMessage("instructor", fallback.feedback);
    } finally {
      setChecking(false);
    }
  };

  const revealAnswer = async () => {
    if (!activeCase || revealLoading || revealed) return;

    setRevealLoading(true);
    try {
      const { data } = await axios.post(`${apiBase}/reveal`, { case: activeCase });
      pushMessage("instructor", data?.reveal || makeReveal(activeCase));
      setRevealed(true);
    } catch (error) {
      pushMessage("instructor", makeReveal(activeCase));
      setRevealed(true);
    } finally {
      setRevealLoading(false);
    }
  };

  const handleMessageKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const messageMeta = (role) => {
    if (role === "student") return { label: "Student", Icon: UserIcon };
    if (role === "patient") return { label: "Patient", Icon: ChatBubbleLeftRightIcon };
    return { label: "Instructor", Icon: LightBulbIcon };
  };

  return (
    <div className="sp-panel sp-diag-shell">
      <div className="sp-diag-toolbar">
        <div>
          <div className="sp-panel-title">Diagnostic Simulation</div>
          <div className="sp-diag-title-row">
            <BeakerIcon className="sp-diag-title-icon" />
            <h3 className="sp-diag-title">{activeCase?.title || "Loading case"}</h3>
          </div>
        </div>

        <div className="sp-diag-controls">
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="sp-select">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <input
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            placeholder="Optional specialty"
            className="sp-input sp-diag-specialty"
          />
          <button type="button" onClick={loadCase} className="sp-btn-primary sp-icon-btn" disabled={caseLoading || sending}>
            <ArrowPathIcon className="sp-inline-icon" />
            {caseLoading ? "Loading" : "New Case"}
          </button>
        </div>
      </div>

      <div className="sp-diag-grid">
        <section className="sp-diag-chat">
          <div className="sp-chat-history sp-diag-history" ref={messagesRef}>
            {messages.map((message) => {
              const { label, Icon } = messageMeta(message.role);
              return (
                <div key={message.id} className={`sp-diag-message ${message.role}`}>
                  <div className="sp-diag-avatar">
                    <Icon className="sp-inline-icon" />
                  </div>
                  <div className="sp-chat-bubble">
                    <div className="sp-chat-role">{label}</div>
                    <div className="sp-diag-message-text">{message.text}</div>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="sp-diag-message patient">
                <div className="sp-diag-avatar">
                  <ChatBubbleLeftRightIcon className="sp-inline-icon" />
                </div>
                <div className="sp-chat-bubble">
                  <div className="sp-chat-role">Patient</div>
                  <div className="sp-diag-message-text">Thinking...</div>
                </div>
              </div>
            )}
          </div>

          <div className="sp-diag-quick-row">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className="sp-diag-chip"
                onClick={() => sendMessage(question)}
                disabled={!activeCase || sending}
              >
                {question}
              </button>
            ))}
          </div>

          <div className="sp-chat-input-row sp-diag-input-row">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleMessageKeyDown}
              placeholder="Ask the patient a clinical question..."
              className="sp-input sp-diag-textarea"
              rows={2}
            />
            <button type="button" onClick={() => sendMessage()} disabled={sending || !activeCase || !input.trim()} className="sp-btn-primary sp-icon-btn">
              <PaperAirplaneIcon className="sp-inline-icon" />
              Send
            </button>
          </div>
        </section>

        <aside className="sp-diag-side">
          <div className="sp-diag-side-section">
            <div className="sp-panel-title">Case</div>
            <div className="sp-diag-case-line">
              <span>Difficulty</span>
              <strong>{activeCase?.difficulty || difficulty}</strong>
            </div>
            <div className="sp-diag-case-line">
              <span>Specialty</span>
              <strong>{activeCase?.specialty || specialty || "general"}</strong>
            </div>
            <div className="sp-diag-case-line">
              <span>Status</span>
              <strong>{revealed ? "Revealed" : "Hidden diagnosis"}</strong>
            </div>
          </div>

          <div className="sp-diag-side-section">
            <div className="sp-panel-title">Diagnosis</div>
            <textarea
              value={diagnosisGuess}
              onChange={(event) => setDiagnosisGuess(event.target.value)}
              placeholder="Write your diagnosis..."
              className="sp-input sp-diag-guess"
              rows={3}
            />
            <div className="sp-diag-action-stack">
              <button type="button" onClick={submitDiagnosis} disabled={checking || !activeCase || !diagnosisGuess.trim()} className="sp-btn-secondary sp-icon-btn">
                <CheckCircleIcon className="sp-inline-icon" />
                {checking ? "Checking" : "Submit Diagnosis"}
              </button>
              <button type="button" onClick={revealAnswer} disabled={revealLoading || !activeCase || revealed} className="sp-btn-warning sp-icon-btn">
                <EyeIcon className="sp-inline-icon" />
                {revealLoading ? "Revealing" : revealed ? "Answer Revealed" : "Reveal Answer"}
              </button>
            </div>
            {evaluation && (
              <div className={`sp-diag-feedback ${evaluation.correct ? "correct" : "review"}`}>
                {evaluation.correct ? "Correct diagnosis." : "Keep refining your diagnosis."}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DiagnosticLab;
