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
    const patientMsg = { role: 'patient', text: c.patient };
    setConversation([{ role: 'system', text: SYSTEM_PROMPT }, patientMsg]);
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
      setConversation((c) => [...c, { role: 'system', text: 'Error contacting AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  const revealAnswer = () => {
    if (!caseAnswer) return;
    setConversation((c) => [...c, { role: 'system', text: `Case answer: ${caseAnswer}` }]);
  };

  return (
    <div className="p-4 border border-gray-200 rounded bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <p className="text-sm text-gray-500">Interact with an AI patient. Use the controls to start a seeded case or role-play with the model. Enable GEMINI_API_KEY in backend for model responses.</p>
        <div className="flex items-center gap-2">
          <select value={caseId} onChange={(e) => {
            const c = CASES.find(x => x.id === e.target.value);
            if (c) startCase(c);
          }} className="border rounded px-2 py-1 text-sm">
            <option value="">Start seeded case...</option>
            {CASES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button onClick={() => { startCase(CASES[Math.floor(Math.random()*CASES.length)]) }} className="bg-gray-100 px-3 py-1 rounded text-sm">Random</button>
          <button onClick={revealAnswer} className="bg-yellow-50 border border-yellow-200 px-3 py-1 rounded text-sm">Reveal Answer</button>
        </div>
      </div>

      <div className="space-y-3 mb-3 max-h-72 overflow-y-auto">
        {conversation.map((m, i) => (
          <div key={i} className={`p-3 rounded ${m.role === 'patient' ? 'bg-indigo-50 border border-indigo-100' : m.role==='system' ? 'bg-yellow-50 border border-yellow-100' : 'bg-white border border-gray-100'}`}>
            <div className="text-xs text-gray-500 mb-1">{m.role.toUpperCase()}</div>
            <div className="text-sm text-gray-800">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the patient..." className="flex-1 border border-gray-300 rounded px-3 py-2" />
        <button onClick={sendMessage} disabled={loading} className="bg-primary text-white px-4 py-2 rounded">Send</button>
      </div>
    </div>
  );
};

export default DiagnosticLab;
