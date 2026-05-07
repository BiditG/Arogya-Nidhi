import { useState } from "react";
import axios from "axios";

const FALLBACK_CASES = [
  {
    id: 'fallback_headache_fever',
    title: 'Headache and fever',
    patientIntro: 'I have had a severe headache and fever for two days. I feel tired and slightly nauseous.',
    patientFacts: {
      age: '19',
      sex: 'male',
      chiefComplaint: 'Headache and fever',
      duration: '2 days',
      onset: 'gradual',
      severity: '6/10',
      associatedSymptoms: ['fatigue', 'nausea'],
      negatives: ['no stiff neck', 'no rash'],
      medications: ['paracetamol once'],
      allergies: ['none known'],
      pastHistory: ['no major illnesses'],
      familyHistory: ['non-contributory'],
      socialHistory: ['non-smoker'],
    },
    diagnosis: 'Viral upper respiratory infection',
    explanation: 'Acute onset headache with fever and fatigue without focal deficits fits a viral illness. Monitor hydration and symptoms. If fever persists or red flags appear, urgent evaluation is needed.',
    differentials: ['influenza', 'sinusitis', 'early meningitis'],
    keyQuestions: ['Any neck stiffness?', 'Any rash?', 'Any recent sick contacts?', 'Any vomiting?'],
    redFlags: ['severe headache with neck stiffness', 'confusion', 'persistent high fever'],
    difficulty: 'easy',
    specialty: 'general',
  },
  {
    id: 'fallback_cough_phlegm',
    title: 'Cough with sputum',
    patientIntro: 'I have a persistent cough producing yellow sputum and mild breathlessness for four days.',
    patientFacts: {
      age: '32',
      sex: 'female',
      chiefComplaint: 'Cough with sputum',
      duration: '4 days',
      onset: 'gradual',
      severity: '5/10',
      associatedSymptoms: ['mild breathlessness', 'low-grade fever'],
      negatives: ['no chest pain', 'no hemoptysis'],
      medications: ['none'],
      allergies: ['none known'],
      pastHistory: ['asthma as a child'],
      familyHistory: ['non-contributory'],
      socialHistory: ['non-smoker'],
    },
    diagnosis: 'Acute bronchitis',
    explanation: 'Productive cough with mild breathlessness and low-grade fever suggests acute bronchitis. Pneumonia should be ruled out if symptoms worsen or fever is high.',
    differentials: ['pneumonia', 'asthma flare', 'upper respiratory infection'],
    keyQuestions: ['Any high fever?', 'Any chest pain?', 'Any wheezing history?'],
    redFlags: ['high fever', 'shortness of breath at rest', 'chest pain'],
    difficulty: 'easy',
    specialty: 'respiratory',
  },
];

const initialMessage = 'Start a case to begin the diagnostic simulation.';

const DiagnosticLab = () => {
  const [conversation, setConversation] = useState([
    { role: "system", text: initialMessage },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [caseLoading, setCaseLoading] = useState(false);
  const [activeCase, setActiveCase] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [specialty, setSpecialty] = useState('');
  const [diagnosisGuess, setDiagnosisGuess] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [revealText, setRevealText] = useState('');
  const [checking, setChecking] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);

  const startConversation = (caseData) => {
    const intro = caseData?.patientIntro || 'I am not feeling well.';
    setConversation([
      { role: 'system', text: `Case loaded: ${caseData?.title || 'Diagnostic case'}. Ask questions to gather symptoms before diagnosing.` },
      { role: 'patient', text: intro },
    ]);
    setInput('');
    setDiagnosisGuess('');
    setEvaluation(null);
    setRevealText('');
  };

  const loadCase = async ({ useFallback = false } = {}) => {
    setCaseLoading(true);
    try {
      let caseData = null;
      if (!useFallback) {
        const { data } = await axios.post('/api/ai/diagnostic/case', {
          difficulty,
          specialty: specialty.trim() || undefined,
        });
        caseData = data?.data || null;
      }

      if (!caseData) {
        caseData = FALLBACK_CASES[Math.floor(Math.random() * FALLBACK_CASES.length)];
      }

      setActiveCase(caseData);
      startConversation(caseData);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not start a case. Please try again.';
      setConversation([{ role: 'system', text: msg }]);
    } finally {
      setCaseLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!activeCase) {
      setConversation((c) => [...c, { role: 'system', text: 'Start a case first.' }]);
      return;
    }
    const userMsg = { role: 'student', text: input.trim() };
    const newConv = [...conversation, userMsg];
    setConversation(newConv);
    setInput("");
    setLoading(true);
    try {
      const payload = {
        case: activeCase,
        messages: newConv.filter((m) => m.role !== 'system'),
      };
      const { data } = await axios.post('/api/ai/diagnostic/reply', payload);
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

  const submitDiagnosis = async () => {
    if (!diagnosisGuess.trim() || !activeCase) return;
    setChecking(true);
    try {
      const { data } = await axios.post('/api/ai/diagnostic/evaluate', {
        case: activeCase,
        guess: diagnosisGuess.trim(),
      });
      const result = data?.result || null;
      setEvaluation(result);
      if (result?.feedback) {
        setConversation((c) => [...c, { role: 'system', text: result.feedback }]);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not evaluate diagnosis.';
      setConversation((c) => [...c, { role: 'system', text: msg }]);
    } finally {
      setChecking(false);
    }
  };

  const revealAnswer = async () => {
    if (!activeCase) return;
    setRevealLoading(true);
    try {
      const { data } = await axios.post('/api/ai/diagnostic/reveal', { case: activeCase });
      const reveal = data?.reveal || '';
      if (reveal) {
        setRevealText(reveal);
        setConversation((c) => [...c, { role: 'system', text: reveal }]);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not reveal the answer.';
      setConversation((c) => [...c, { role: 'system', text: msg }]);
    } finally {
      setRevealLoading(false);
    }
  };

  return (
    <div className="sp-panel">
      <div className="sp-diag-controls">
        <p style={{ fontSize: '0.8125rem', color: 'var(--pp-text-secondary)', flex: 1, minWidth: '220px' }}>
          Diagnose an AI patient by asking clarifying questions. When ready, submit your diagnosis. If you are stuck, reveal the answer for learning.
        </p>
        <div className="sp-row" style={{ flexWrap: 'wrap' }}>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="sp-select">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Optional specialty"
            className="sp-input"
            style={{ maxWidth: '180px' }}
          />
          <button onClick={() => loadCase()} className="sp-btn-primary" disabled={caseLoading}>
            {caseLoading ? 'Starting...' : 'New AI Case'}
          </button>
          <button onClick={() => loadCase({ useFallback: true })} className="sp-btn-secondary" disabled={caseLoading}>
            Use Sample Case
          </button>
          <button onClick={revealAnswer} className="sp-btn-warning" disabled={!activeCase || revealLoading || Boolean(revealText)}>
            {revealLoading ? 'Revealing...' : 'Reveal Answer'}
          </button>
        </div>
      </div>

      {activeCase && (
        <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-muted)', marginBottom: '0.75rem' }}>
          Case: <strong>{activeCase.title}</strong> | Difficulty: {activeCase.difficulty || 'medium'} | Specialty: {activeCase.specialty || 'general'}
        </div>
      )}

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
          placeholder="Ask the patient a question..."
          className="sp-input"
        />
        <button onClick={sendMessage} disabled={loading || !activeCase} className="sp-btn-primary">
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div className="sp-chat-input-row" style={{ marginTop: '0.75rem' }}>
        <input
          value={diagnosisGuess}
          onChange={(e) => setDiagnosisGuess(e.target.value)}
          placeholder="Enter your diagnosis..."
          className="sp-input"
        />
        <button onClick={submitDiagnosis} disabled={checking || !activeCase} className="sp-btn-secondary">
          {checking ? 'Checking...' : 'Submit Diagnosis'}
        </button>
      </div>

      {evaluation && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: evaluation.correct ? '#16a34a' : 'var(--pp-text-secondary)' }}>
          {evaluation.correct ? 'Correct diagnosis.' : 'Not correct yet. You can keep asking questions or reveal the answer.'}
        </div>
      )}

      {revealText && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--pp-text-muted)' }}>
          Answer revealed. Review the explanation in the chat above.
        </div>
      )}
    </div>
  );
};

export default DiagnosticLab;
