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
    `Difficulty: ${diff}. Specialty focus: ${spec}.`,
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
    const data = normalizeDiagnosticCase(parsed || FALLBACK_DIAGNOSTIC_CASE);
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
      const fallback = caseData.patientIntro || 'I am not sure how to describe it.';
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