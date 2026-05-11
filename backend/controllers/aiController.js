import aiAssistantService from '../services/aiAssistant.service.js';
import fetch from 'node-fetch';

let GoogleGenAI;
try {
  GoogleGenAI = (await import('@google/genai')).GoogleGenAI;
} catch (e) {
  GoogleGenAI = null;
}

const FALLBACK_DIAGNOSTIC_CASE = {
  id: 'case_fallback_rlq_pain',
  title: 'Right lower abdominal pain',
  patientIntro: 'I have sharp pain in my lower right abdomen since last night with some nausea.',
  patientFacts: {
    age: '22',
    sex: 'female',
    chiefComplaint: 'Right lower abdominal pain',
    duration: '12 hours',
    onset: 'Started near the belly button and moved to the lower right side',
    severity: '7/10',
    associatedSymptoms: ['nausea', 'loss of appetite', 'mild fever'],
    negatives: ['no vomiting', 'no diarrhea', 'no urinary burning'],
    medications: ['none'],
    allergies: ['none known'],
    pastHistory: ['no major illnesses'],
    familyHistory: ['non-contributory'],
    socialHistory: ['non-smoker'],
  },
  diagnosis: 'Acute appendicitis',
  explanation: 'Migrating right lower quadrant pain with nausea, anorexia, and mild fever is classic for appendicitis. The pattern and location make this more likely than gastroenteritis. The next step is urgent clinical evaluation and imaging when needed.',
  differentials: ['gastroenteritis', 'ovarian cyst', 'urinary tract infection', 'mesenteric adenitis'],
  keyQuestions: ['Where did the pain start?', 'Any loss of appetite?', 'Any vomiting or diarrhea?', 'Any urinary symptoms?'],
  redFlags: ['worsening severe pain', 'persistent high fever', 'rebound tenderness'],
  difficulty: 'easy',
  specialty: 'general',
};

const FALLBACK_DIAGNOSTIC_CASES = [
  FALLBACK_DIAGNOSTIC_CASE,
  {
    id: 'case_fallback_polyuria_thirst',
    title: 'Excessive thirst and frequent urination',
    patientIntro: 'I have been very thirsty and going to the bathroom a lot for the past few weeks. I also feel unusually tired.',
    patientFacts: {
      age: '45',
      sex: 'male',
      chiefComplaint: 'Excessive thirst and frequent urination',
      duration: '3 weeks',
      onset: 'Gradual',
      severity: 'Moderate',
      associatedSymptoms: ['fatigue', 'blurred vision', 'unintentional weight loss'],
      negatives: ['no fever', 'no pain passing urine', 'no flank pain'],
      medications: ['none'],
      allergies: ['none known'],
      pastHistory: ['overweight', 'borderline high blood pressure'],
      familyHistory: ['father has type 2 diabetes'],
      socialHistory: ['sedentary office work', 'drinks sugary tea frequently'],
    },
    diagnosis: 'Type 2 diabetes mellitus',
    explanation: 'Polyuria, polydipsia, fatigue, blurred vision, weight loss, and family history strongly suggest diabetes mellitus. Confirmation requires blood glucose and HbA1c testing.',
    differentials: ['urinary tract infection', 'diabetes insipidus', 'hyperthyroidism'],
    keyQuestions: ['Any increased thirst?', 'Any weight loss?', 'Any blurred vision?', 'Any family history of diabetes?'],
    redFlags: ['confusion', 'vomiting', 'dehydration', 'rapid breathing'],
    difficulty: 'easy',
    specialty: 'endocrinology',
  },
  {
    id: 'case_fallback_wheeze_night',
    title: 'Night cough and wheeze',
    patientIntro: 'I keep waking up coughing at night, and sometimes I hear a whistling sound when I breathe.',
    patientFacts: {
      age: '17',
      sex: 'female',
      chiefComplaint: 'Night cough and wheeze',
      duration: '1 month',
      onset: 'Intermittent, worse at night and after exercise',
      severity: '5/10 during episodes',
      associatedSymptoms: ['chest tightness', 'shortness of breath with running'],
      negatives: ['no fever', 'no sputum', 'no chest pain'],
      medications: ['occasional cough syrup'],
      allergies: ['dust allergy'],
      pastHistory: ['eczema in childhood'],
      familyHistory: ['mother has asthma'],
      socialHistory: ['lives near a busy road', 'non-smoker'],
    },
    diagnosis: 'Bronchial asthma',
    explanation: 'Episodic wheeze, nocturnal cough, exercise symptoms, atopy, and family history are consistent with asthma. Spirometry can help confirm the diagnosis.',
    differentials: ['viral bronchitis', 'allergic rhinitis with postnasal drip', 'vocal cord dysfunction'],
    keyQuestions: ['Any wheezing?', 'Is it worse at night?', 'Any exercise trigger?', 'Any allergy history?'],
    redFlags: ['breathlessness at rest', 'silent chest', 'cyanosis'],
    difficulty: 'medium',
    specialty: 'respiratory',
  },
  {
    id: 'case_fallback_chest_pressure',
    title: 'Chest pressure on exertion',
    patientIntro: 'I get a heavy pressure in the middle of my chest when I climb stairs. It goes away after I rest.',
    patientFacts: {
      age: '58',
      sex: 'male',
      chiefComplaint: 'Exertional chest pressure',
      duration: '2 months',
      onset: 'Gradual, triggered by exertion',
      severity: '6/10',
      associatedSymptoms: ['sweating during episodes', 'mild shortness of breath'],
      negatives: ['no fever', 'no cough', 'no sharp pleuritic pain', 'no pain at rest'],
      medications: ['amlodipine'],
      allergies: ['none known'],
      pastHistory: ['hypertension', 'high cholesterol'],
      familyHistory: ['older brother had a heart attack'],
      socialHistory: ['former smoker'],
    },
    diagnosis: 'Stable angina',
    explanation: 'Retrosternal exertional pressure relieved by rest with cardiovascular risk factors is typical of stable angina. It requires cardiovascular assessment and risk management.',
    differentials: ['gastroesophageal reflux disease', 'costochondritis', 'anxiety', 'unstable angina'],
    keyQuestions: ['Is pain exertional?', 'Does rest relieve it?', 'Any radiation?', 'Any cardiac risk factors?'],
    redFlags: ['pain at rest', 'syncope', 'persistent chest pain', 'new neurologic symptoms'],
    difficulty: 'hard',
    specialty: 'cardiology',
  },
  {
    id: 'case_fallback_dysuria_frequency',
    title: 'Burning urination',
    patientIntro: 'It burns when I urinate, and I need to go much more often than usual.',
    patientFacts: {
      age: '26',
      sex: 'female',
      chiefComplaint: 'Burning urination and frequency',
      duration: '2 days',
      onset: 'Sudden',
      severity: '4/10',
      associatedSymptoms: ['urgency', 'lower abdominal discomfort'],
      negatives: ['no flank pain', 'no fever', 'no vaginal discharge'],
      medications: ['none'],
      allergies: ['none known'],
      pastHistory: ['one similar episode last year'],
      familyHistory: ['non-contributory'],
      socialHistory: ['sexually active'],
    },
    diagnosis: 'Acute uncomplicated cystitis',
    explanation: 'Dysuria, urinary frequency, urgency, and suprapubic discomfort without fever or flank pain fit uncomplicated cystitis. Urinalysis can support the diagnosis.',
    differentials: ['pyelonephritis', 'urethritis', 'vaginitis'],
    keyQuestions: ['Any fever?', 'Any flank pain?', 'Any vaginal discharge?', 'Any previous UTIs?'],
    redFlags: ['fever', 'flank pain', 'pregnancy', 'blood in urine'],
    difficulty: 'easy',
    specialty: 'urology',
  },
];

let lastFallbackCaseKey = '';

const cloneDiagnosticCase = (caseData) => ({
  ...caseData,
  id: `${caseData.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  patientFacts: { ...(caseData.patientFacts || {}) },
  differentials: [...(caseData.differentials || [])],
  keyQuestions: [...(caseData.keyQuestions || [])],
  redFlags: [...(caseData.redFlags || [])],
});

const pickFallbackDiagnosticCase = ({ difficulty, specialty } = {}) => {
  const diff = String(difficulty || '').toLowerCase();
  const spec = String(specialty || '').trim().toLowerCase();
  const matching = FALLBACK_DIAGNOSTIC_CASES.filter((caseData) => {
    const difficultyMatch = SAFE_DIFFICULTY.has(diff) ? caseData.difficulty === diff : true;
    const specialtyMatch = spec ? String(caseData.specialty || '').toLowerCase().includes(spec) : true;
    return difficultyMatch && specialtyMatch;
  });
  const pool = matching.length ? matching : FALLBACK_DIAGNOSTIC_CASES;
  const candidates = pool.length > 1 ? pool.filter((caseData) => caseData.id !== lastFallbackCaseKey) : pool;
  const selected = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
  lastFallbackCaseKey = selected.id;
  return cloneDiagnosticCase(selected);
};

const SAFE_DIFFICULTY = new Set(['easy', 'medium', 'hard']);

const safeText = (value, fallback = '') => (typeof value === 'string' ? value.trim() : fallback);
const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
};

const extractJson = (text) => {
  if (!text) return null;
  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i)?.[1] || trimmed.match(/```\s*([\s\S]*?)\s*```/i)?.[1];
    if (fenced) {
      try {
        return JSON.parse(fenced.trim());
      } catch {
        return null;
      }
    }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
};

const normalizeDiagnosticCase = (raw) => {
  if (!raw || typeof raw !== 'object') return FALLBACK_DIAGNOSTIC_CASE;
  const patientFacts = (raw.patientFacts && typeof raw.patientFacts === 'object')
    ? raw.patientFacts
    : (raw.patient_facts && typeof raw.patient_facts === 'object')
      ? raw.patient_facts
      : (raw.facts && typeof raw.facts === 'object')
        ? raw.facts
        : {};

  const title = safeText(raw.title || raw.caseTitle, FALLBACK_DIAGNOSTIC_CASE.title);
  const patientIntro = safeText(raw.patientIntro || raw.patient_intro, safeText(patientFacts.patientIntro || patientFacts.chiefComplaint, FALLBACK_DIAGNOSTIC_CASE.patientIntro));
  const diagnosis = safeText(raw.diagnosis || raw.answer, FALLBACK_DIAGNOSTIC_CASE.diagnosis);
  const explanation = safeText(raw.explanation || raw.rationale, FALLBACK_DIAGNOSTIC_CASE.explanation);
  const difficulty = SAFE_DIFFICULTY.has(String(raw.difficulty || '').toLowerCase())
    ? String(raw.difficulty).toLowerCase()
    : FALLBACK_DIAGNOSTIC_CASE.difficulty;
  const specialty = safeText(raw.specialty, FALLBACK_DIAGNOSTIC_CASE.specialty);

  return {
    id: safeText(raw.id, `case_${Date.now()}`),
    title,
    patientIntro,
    patientFacts,
    diagnosis,
    explanation,
    differentials: toArray(raw.differentials).length ? toArray(raw.differentials) : FALLBACK_DIAGNOSTIC_CASE.differentials,
    keyQuestions: toArray(raw.keyQuestions || raw.key_questions).length ? toArray(raw.keyQuestions || raw.key_questions) : FALLBACK_DIAGNOSTIC_CASE.keyQuestions,
    redFlags: toArray(raw.redFlags || raw.red_flags).length ? toArray(raw.redFlags || raw.red_flags) : FALLBACK_DIAGNOSTIC_CASE.redFlags,
    difficulty,
    specialty,
  };
};

const buildCasePrompt = ({ difficulty, specialty }) => {
  const diff = SAFE_DIFFICULTY.has(String(difficulty || '').toLowerCase()) ? String(difficulty).toLowerCase() : 'medium';
  const spec = safeText(specialty, 'general');
  const freshnessSeed = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return [
    'You create medical training cases for students to diagnose.',
    'Return ONLY valid JSON (no markdown).',
    'JSON fields:',
    '{',
    '  "id": "string",',
    '  "title": "string",',
    '  "patientIntro": "string",',
    '  "patientFacts": {',
    '    "age": "string",',
    '    "sex": "string",',
    '    "chiefComplaint": "string",',
    '    "duration": "string",',
    '    "onset": "string",',
    '    "severity": "string",',
    '    "associatedSymptoms": ["string"],',
    '    "negatives": ["string"],',
    '    "medications": ["string"],',
    '    "allergies": ["string"],',
    '    "pastHistory": ["string"],',
    '    "familyHistory": ["string"],',
    '    "socialHistory": ["string"]',
    '  },',
    '  "diagnosis": "string",',
    '  "explanation": "string",',
    '  "differentials": ["string"],',
    '  "keyQuestions": ["string"],',
    '  "redFlags": ["string"],',
    '  "difficulty": "easy|medium|hard",',
    '  "specialty": "string"',
    '}',
    'Rules:',
    '- PatientIntro is a short first-person opener (1-2 sentences).',
    '- Keep symptoms realistic and safe for training (no graphic details).',
    '- Do not include tests or imaging results in patientFacts.',
    '- Create a fresh patient case each time. Vary the complaint, demographic details, timing, diagnosis, and clues.',
    '- Make the id include the freshness seed so repeated requests do not reuse the same case id.',
    `Difficulty: ${diff}. Specialty focus: ${spec}.`,
    `Freshness seed: ${freshnessSeed}.`,
  ].join('\n');
};

const buildPatientPrompt = (caseData, messages) => {
  const facts = JSON.stringify(caseData.patientFacts || {}, null, 2);
  const lines = (messages || [])
    .filter((m) => m && m.text && String(m.text).trim() && String(m.role || '').toLowerCase() !== 'system')
    .slice(-8)
    .map((m) => `${String(m.role || 'student').toLowerCase()}: ${m.text}`);

  return [
    'You are role-playing as a patient in a diagnostic training lab.',
    'Use ONLY the patient facts below. Be brief and realistic.',
    'Do not reveal or confirm any diagnosis, even if asked.',
    'If asked about tests or exams you have not had, say they have not been done.',
    'If asked about things outside the facts, say you are not sure.',
    'Patient facts (known to the patient):',
    facts,
    'Conversation:',
    ...lines,
  ].join('\n');
};

const includesAny = (text, terms) => terms.some((term) => text.includes(term));

const formatList = (value, fallback = 'I am not sure') => {
  const values = toArray(value);
  return values.length ? values.join(', ') : fallback;
};

const fallbackPatientReply = (caseData, messages = []) => {
  const facts = caseData.patientFacts || {};
  const latest = [...messages].reverse().find((message) =>
    String(message?.role || '').toLowerCase() === 'student' && String(message?.text || '').trim()
  );
  const question = String(latest?.text || '').toLowerCase();

  if (!question) return caseData.patientIntro || 'I am not feeling well.';

  if (includesAny(question, ['diagnosis', 'diagnose', 'condition', 'what do i have', 'what is it'])) {
    return "I do not know what it is. That is why I came to you.";
  }

  if (includesAny(question, ['age', 'old'])) return `I am ${facts.age || 'not sure'} years old.`;
  if (includesAny(question, ['sex', 'gender', 'male', 'female'])) return `I am ${facts.sex || 'not sure'}.`;
  if (includesAny(question, ['why', 'complaint', 'problem', 'symptom', 'brought'])) {
    return facts.chiefComplaint || caseData.patientIntro || 'I am not feeling well.';
  }
  if (includesAny(question, ['how long', 'duration', 'when did', 'started', 'start'])) {
    return `It has been going on for ${facts.duration || 'a little while'}. ${facts.onset ? `It ${facts.onset}.` : ''}`.trim();
  }
  if (includesAny(question, ['pain', 'where', 'location'])) {
    return facts.chiefComplaint || 'I mostly notice the main symptom I mentioned.';
  }
  if (includesAny(question, ['scale', 'severe', 'severity', 'bad'])) {
    return `I would rate it around ${facts.severity || 'moderate'}.`;
  }
  if (includesAny(question, ['associated', 'other symptoms', 'anything else', 'nausea', 'fever', 'cough', 'breath', 'vision', 'urination', 'urinate', 'wheeze'])) {
    const positives = formatList(facts.associatedSymptoms, 'I have not noticed much else');
    const negatives = formatList(facts.negatives, '');
    return negatives ? `I have noticed ${positives}. I have not had ${negatives}.` : `I have noticed ${positives}.`;
  }
  if (includesAny(question, ['not have', 'negative', 'deny', 'rash', 'vomit', 'diarrhea', 'chest pain', 'flank', 'fever'])) {
    return `I have not had ${formatList(facts.negatives, 'anything specific that I can remember')}.`;
  }
  if (includesAny(question, ['medicine', 'medication', 'drug', 'tablet', 'taking'])) {
    return `I am taking ${formatList(facts.medications, 'no regular medicines')}.`;
  }
  if (includesAny(question, ['allergy', 'allergies'])) {
    return `My allergies are ${formatList(facts.allergies, 'none that I know of')}.`;
  }
  if (includesAny(question, ['past', 'history', 'illness', 'disease', 'medical problems'])) {
    return `My past history is ${formatList(facts.pastHistory, 'not significant')}.`;
  }
  if (includesAny(question, ['family'])) {
    return `In my family history, ${formatList(facts.familyHistory, 'nothing important comes to mind')}.`;
  }
  if (includesAny(question, ['smoke', 'alcohol', 'work', 'social', 'lifestyle'])) {
    return `For social history: ${formatList(facts.socialHistory, 'nothing special')}.`;
  }
  if (includesAny(question, ['test', 'lab', 'x-ray', 'scan', 'imaging', 'blood'])) {
    return 'I have not had any tests done yet.';
  }
  if (includesAny(question, ['examine', 'exam', 'tender', 'pulse', 'bp', 'temperature'])) {
    return 'No one has examined me yet, so I am not sure about those findings.';
  }

  return 'I am not sure about that. I can tell you more about what I have been feeling.';
};

const buildEvaluatePrompt = (caseData, guess) => {
  return [
    'You are a medical instructor evaluating a student diagnosis.',
    'Return ONLY JSON with fields: correct (boolean), closeness ("exact"|"close"|"incorrect"), feedback (string).',
    'Do NOT reveal the correct diagnosis in the feedback.',
    `Correct diagnosis: ${caseData.diagnosis}`,
    `Student guess: ${guess}`,
  ].join('\n');
};

const buildRevealPrompt = (caseData) => {
  return [
    'You are a medical instructor revealing the answer for a diagnostic case.',
    'Write a concise reveal with the diagnosis and a short explanation (3-5 sentences).',
    'Add 2-3 key learning points as bullets.',
    'Case details:',
    JSON.stringify({
      title: caseData.title,
      patientFacts: caseData.patientFacts,
      diagnosis: caseData.diagnosis,
      explanation: caseData.explanation,
      differentials: caseData.differentials,
      redFlags: caseData.redFlags,
    }, null, 2),
  ].join('\n');
};

const generateGeminiText = async (prompt, { temperature = 0.3, maxOutputTokens = 512 } = {}) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GENERATIVE_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (GoogleGenAI) {
    try {
      const client = new GoogleGenAI({ apiKey });
      const result = await client.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens },
      });

      return (
        result?.candidates?.[0]?.content?.parts?.[0]?.text ||
        result?.text ||
        null
      );
    } catch (err) {
      console.error('GoogleGenAI SDK error:', err?.message || err);
    }
  }

  const encodedModel = encodeURIComponent(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('Gemini API error:', response.status, errText || '(empty body)');
    return null;
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
};

export const diagnose = async (req, res) => {
  try {
    const { messages } = req.body;
    console.log(
      'diagnose called, received messages:',
      Array.isArray(messages) ? messages.length : typeof messages
    );

    const last = messages?.slice(-6) || [];

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GENERATIVE_API_KEY;

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    console.log('GEMINI apiKey present?', !!apiKey, 'model:', model);

    if (apiKey) {
      // Build prompt
      const promptParts = [
        'You are role-playing as a mock patient. Answer briefly and consistently about symptoms when asked.',
      ];

      last.forEach((m) => {
        const role = (m.role || 'user').toLowerCase();
        promptParts.push(`${role}: ${m.text}`);
      });

      const prompt = promptParts.join('\n');

      // ✅ Try SDK first
      if (GoogleGenAI) {
        try {
          const client = new GoogleGenAI({ apiKey });

          const result = await client.models.generateContent({
            model,
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 512,
            },
          });

          const text =
            result?.candidates?.[0]?.content?.parts?.[0]?.text ||
            result?.text ||
            JSON.stringify(result);

          return res.json({ success: true, reply: text });
        } catch (err) {
          console.error('GoogleGenAI SDK error:', err?.message || err);
          // fallback to fetch
        }
      }

      // ✅ HTTP fallback (correct Gemini API)
      const encodedModel = encodeURIComponent(model);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${apiKey}`;

      console.log('Calling Gemini API:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');

        console.error(
          'Gemini API error:',
          response.status,
          errText || '(empty body)'
        );

        const STATUS_MESSAGES = {
          400: `Invalid request to Gemini API (400). The model name "${model}" may be incorrect — update GEMINI_MODEL in backend .env (e.g. gemini-1.5-flash).`,
          401: 'Invalid Gemini API key (401). Check GEMINI_API_KEY in backend .env.',
          403: 'Access denied to Gemini API (403). The API may not be enabled for this key, or there may be region restrictions.',
          404: `Gemini model "${model}" not found (404). Update GEMINI_MODEL in backend .env (e.g. gemini-1.5-flash).`,
          429: 'Gemini API rate limit reached (429). Please wait a moment and try again.',
        };

        const reply =
          STATUS_MESSAGES[response.status] ||
          `Gemini API returned an unexpected error (${response.status}). Check the backend logs.`;

        return res.json({ success: true, reply });
      }

      const data = await response.json();

      console.log(
        'Gemini response:',
        JSON.stringify(data).slice(0, 500)
      );

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        JSON.stringify(data);

      return res.json({ success: true, reply });
    }

    // ✅ No API key fallback
    const reply =
      last?.length && last.slice(-1)[0].text
        ? `Based on your symptoms: "${
            last.slice(-1)[0].text.slice(0, 120)
          }" — please consult a doctor for a proper diagnosis. (No API key configured)`
        : 'Please describe your symptoms so I can help guide you.';

    return res.json({ success: true, reply });
  } catch (error) {
    console.error('aiController.diagnose error:', error);

    res.status(500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};

export const generateDiagnosticCase = async (req, res) => {
  try {
    const { difficulty, specialty } = req.body || {};
    const prompt = buildCasePrompt({ difficulty, specialty });
    const text = await generateGeminiText(prompt, { temperature: 0.4, maxOutputTokens: 800 });
    const parsed = extractJson(text);
    const data = normalizeDiagnosticCase(parsed || pickFallbackDiagnosticCase({ difficulty, specialty }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('aiController.generateDiagnosticCase error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Server error' });
  }
};

export const diagnosticReply = async (req, res) => {
  try {
    const caseData = normalizeDiagnosticCase(req.body?.case || FALLBACK_DIAGNOSTIC_CASE);
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const prompt = buildPatientPrompt(caseData, messages);
    const text = await generateGeminiText(prompt, { temperature: 0.3, maxOutputTokens: 512 });

    if (!text) {
      const fallback = fallbackPatientReply(caseData, messages);
      return res.json({ success: true, reply: fallback });
    }

    return res.json({ success: true, reply: text });
  } catch (error) {
    console.error('aiController.diagnosticReply error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Server error' });
  }
};

export const diagnosticEvaluate = async (req, res) => {
  try {
    const caseData = normalizeDiagnosticCase(req.body?.case || FALLBACK_DIAGNOSTIC_CASE);
    const guess = safeText(req.body?.guess, '');
    if (!guess) return res.status(400).json({ success: false, message: 'Diagnosis guess is required' });

    const prompt = buildEvaluatePrompt(caseData, guess);
    const text = await generateGeminiText(prompt, { temperature: 0.2, maxOutputTokens: 256 });
    const parsed = extractJson(text) || {};

    const diagnosis = safeText(caseData.diagnosis, '').toLowerCase();
    const guessLower = guess.toLowerCase();
    const fallbackCorrect = diagnosis && (guessLower.includes(diagnosis) || diagnosis.includes(guessLower));

    const result = {
      correct: typeof parsed.correct === 'boolean' ? parsed.correct : Boolean(fallbackCorrect),
      closeness: ['exact', 'close', 'incorrect'].includes(String(parsed.closeness || '').toLowerCase())
        ? String(parsed.closeness).toLowerCase()
        : (fallbackCorrect ? 'exact' : 'incorrect'),
      feedback: safeText(parsed.feedback, fallbackCorrect
        ? 'Good job. Your diagnosis matches the case.'
        : 'Not quite. Consider the symptom timing, location, and associated findings.'),
    };

    return res.json({ success: true, result });
  } catch (error) {
    console.error('aiController.diagnosticEvaluate error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Server error' });
  }
};

export const diagnosticReveal = async (req, res) => {
  try {
    const caseData = normalizeDiagnosticCase(req.body?.case || FALLBACK_DIAGNOSTIC_CASE);
    const prompt = buildRevealPrompt(caseData);
    const text = await generateGeminiText(prompt, { temperature: 0.2, maxOutputTokens: 512 });

    const fallback = `Diagnosis: ${caseData.diagnosis}. ${caseData.explanation}`;
    return res.json({ success: true, reveal: text || fallback });
  } catch (error) {
    console.error('aiController.diagnosticReveal error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Server error' });
  }
};

export const assistant = async (req, res) => {
  try {
    const userId =
      req.user?.userId || req.user?.sub || req.user?.id || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User id not found in token',
      });
    }

    const { message } = req.body;

    const result = await aiAssistantService.processMessage(
      userId,
      message
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};
