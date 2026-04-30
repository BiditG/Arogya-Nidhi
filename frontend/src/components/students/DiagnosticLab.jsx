import { useState } from "react";
import axios from "axios";

const CASES = [
  {
    id: 'headache_fever',
    title: 'Headache & Fever',
    patient: 'I have had a severe headache and fever for two days. I feel tired and slightly nauseous.',
    answer: 'Likely viral infection; consider testing for influenza or COVID; seek medical evaluation for persistent high fever.'
  },
  {
    id: 'cough_phlegm',
    title: 'Cough with sputum',
    patient: 'I have a persistent cough producing yellow sputum and mild breathlessness for four days.',
    answer: 'Possible bacterial bronchitis or pneumonia; examine chest, consider antibiotics if indicated.'
  },
  {
    id: 'abdominal_pain',
    title: 'Lower abdominal pain',
    patient: 'I have lower abdominal cramping and loose stools for a day, with some cramping after eating.',
    answer: 'Likely gastroenteritis; stay hydrated; see a clinician if pain worsens or blood appears in stool.'
  }
];

const SYSTEM_PROMPT = `You are role-playing as a mock patient. Answer questions briefly and consistently. Stay in character as the patient, give realistic symptom descriptions, avoid diagnosing yourself, and only provide information a patient would know (onset, severity, location, associated symptoms, medications, allergies, relevant history). Keep replies short.`;

const DiagnosticLab = () => {
  const [conversation, setConversation] = useState([
    { role: "system", text: SYSTEM_PROMPT },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [caseAnswer, setCaseAnswer] = useState('');

  const startCase = (c) => {
    if (!c) return;
    setConversation([{ role: 'system', text: SYSTEM_PROMPT }, { role: 'patient', text: c.patient }]);
    setCaseId(c.id);
    setCaseAnswer(c.answer);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'student', text: input.trim() };
    const newConv = [...conversation, userMsg];
    setConversation(newConv);
    setInput("");
    setLoading(true);
    try {
      const { data } = await axios.post('/api/ai/diagnose', { messages: newConv });
      const replyText = data?.reply || 'No response';
      setConversation((c) => [...c, { role: 'patient', text: replyText }]);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not reach the AI service. Is the backend running?';
      setConversation((c) => [...c, { role: 'system', text: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const revealAnswer = () => {
    if (!caseAnswer) return;
    setConversation((c) => [...c, { role: 'system', text: `Case answer: ${caseAnswer}` }]);
  };

  return (
    <div className="sp-panel">
      <div className="sp-diag-controls">
        <p style={{ fontSize: '0.8125rem', color: 'var(--pp-text-secondary)', flex: 1, minWidth: '200px' }}>
          Interact with an AI patient. Start a seeded case or free-form role-play. Enable GEMINI_API_KEY in backend for model responses.
        </p>
        <div className="sp-row" style={{ flexWrap: 'wrap' }}>
          <select
            value={caseId}
            onChange={(e) => {
              const c = CASES.find(x => x.id === e.target.value);
              if (c) startCase(c);
            }}
            className="sp-select"
          >
            <option value="">Start seeded case…</option>
            {CASES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button
            onClick={() => startCase(CASES[Math.floor(Math.random() * CASES.length)])}
            className="sp-btn-secondary"
          >
            Random
          </button>
          <button onClick={revealAnswer} className="sp-btn-warning">
            Reveal Answer
          </button>
        </div>
      </div>

      <div className="sp-chat-history">
        {conversation.map((m, i) => (
          <div key={i} className={`sp-chat-bubble ${m.role}`}>
            <div className="sp-chat-role">{m.role}</div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>

      <div className="sp-chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask the patient a question…"
          className="sp-input"
        />
        <button onClick={sendMessage} disabled={loading} className="sp-btn-primary">
          {loading ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default DiagnosticLab;
