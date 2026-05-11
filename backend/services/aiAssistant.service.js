import dashboardService from './dashboard.service.js';

const SPECIALTIES = [
  { key: 'Cardiology', label: 'Cardiologist', synonyms: ['cardiology', 'cardiologist', 'heart'] },
  { key: 'Neurology', label: 'Neurologist', synonyms: ['neurology', 'neurologist', 'brain', 'nervous system'] },
  { key: 'Dermatology', label: 'Dermatologist', synonyms: ['dermatology', 'dermatologist', 'skin'] },
  { key: 'Orthopedics', label: 'Orthopedic', synonyms: ['orthopedics', 'orthopedic', 'bone', 'bones', 'joint', 'joints'] },
  { key: 'Pediatrics', label: 'Pediatrician', synonyms: ['pediatrics', 'pediatrician', 'child', 'children'] },
  { key: 'General', label: 'General Physician', synonyms: ['general', 'general physician', 'family doctor', 'primary care'] },
];

const TRIAGE_RULES = [
  {
    specialty: 'Cardiology',
    keywords: ['heart pain', 'chest pain', 'chest tightness', 'chest pressure', 'palpitation', 'shortness of breath', 'left chest'],
    causeHint: 'Possible reasons include acidity, muscle strain, anxiety, or reduced blood flow to the heart.',
    urgencyLevel: 'high',
    confidenceScore: 0.92,
    aiReasoning: 'Chest discomfort, palpitations, or shortness of breath can indicate a cardiac concern, so cardiology review is recommended.',
  },
  {
    specialty: 'Neurology',
    keywords: ['headache', 'migraine', 'dizziness', 'vertigo', 'seizure', 'numbness', 'tingling', 'memory loss'],
    causeHint: 'Possible reasons include migraine, nerve irritation, inner-ear imbalance, or other neurological causes.',
    urgencyLevel: 'medium',
    confidenceScore: 0.86,
    aiReasoning: 'Headache, dizziness, seizure-like symptoms, numbness, or memory symptoms point toward a neurological evaluation.',
  },
  {
    specialty: 'Dermatology',
    keywords: ['rash', 'itching', 'itchy skin', 'acne', 'eczema', 'psoriasis', 'skin infection', 'hair fall'],
    causeHint: 'Possible reasons include allergy, infection, dermatitis, or inflammatory skin conditions.',
    urgencyLevel: 'low',
    confidenceScore: 0.84,
    aiReasoning: 'Skin rash, itching, acne, eczema, psoriasis, infection, or hair fall are best assessed by dermatology.',
  },
  {
    specialty: 'Orthopedics',
    keywords: ['joint pain', 'knee pain', 'back pain', 'neck pain', 'shoulder pain', 'fracture', 'sprain', 'bone pain'],
    causeHint: 'Possible reasons include ligament strain, arthritis, disc issues, or minor bone and joint injury.',
    urgencyLevel: 'medium',
    confidenceScore: 0.82,
    aiReasoning: 'Joint, back, neck, shoulder, fracture, sprain, or bone pain suggests a musculoskeletal issue for orthopedics.',
  },
  {
    specialty: 'Pediatrics',
    keywords: ['my child', 'my baby', 'child has', 'baby has', 'infant', 'child fever', 'pediatric'],
    causeHint: 'Possible reasons vary by age and symptom, including viral infections and common pediatric illnesses.',
    urgencyLevel: 'medium',
    confidenceScore: 0.8,
    aiReasoning: 'Symptoms described for a child, baby, or infant should be reviewed by pediatrics.',
  },
];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const SESSIONS = new Map();
const NUMBER_WORDS = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
};

function getSessionKey(userId, options = {}) {
  return options.sessionKey || String(userId);
}

function getSession(sessionKey) {
  if (!SESSIONS.has(sessionKey)) {
    SESSIONS.set(sessionKey, {
      step: 'specialty',
      draft: {
        specialty: null,
        doctorId: null,
        doctorName: null,
        date: null,
        time: null,
        notes: null,
      },
      doctors: [],
      availableSlots: [...TIME_SLOTS],
    });
  }

  return SESSIONS.get(sessionKey);
}

function resetSession(sessionKey) {
  SESSIONS.delete(sessionKey);
}

function getChannel(options = {}) {
  return options.channel === 'voice' ? 'voice' : 'text';
}

function forChannel(textReply, voiceReply, options = {}) {
  return getChannel(options) === 'voice' ? voiceReply : textReply;
}

function replaceNumberWords(text) {
  return String(text || '').replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi,
    (match) => NUMBER_WORDS[match.toLowerCase()] || match
  );
}

function normalizeText(text) {
  return replaceNumberWords(String(text || '').trim().toLowerCase());
}

function formatSpecialtyList() {
  return SPECIALTIES.map((s) => s.label).join(', ');
}

function buildAction(type, label, value, extra = {}) {
  return { type, label, value, ...extra };
}

function formatConfidenceScore(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.min(1, parsed)).toFixed(4);
}

function makeTriageDecisionPayload(triage, symptomText) {
  const confidenceScore = formatConfidenceScore(triage?.confidenceScore) || '0.7500';
  return {
    queryId: null,
    recommendedSpecialty: triage?.specialty?.key || triage?.specialty?.label || null,
    urgencyLevel: triage?.urgencyLevel || 'medium',
    confidenceScore,
    aiReasoning:
      triage?.aiReasoning ||
      `${triage?.causeHint || 'The symptom description suggests a specialty referral.'} Patient described: ${String(symptomText || '').slice(0, 240)}`,
  };
}



function cleanDoctorName(name) {
  return String(name || 'Doctor').replace(/^dr\.?\s+/i, '').trim() || 'Doctor';
}

function normalizeDoctorNameText(value) {
  return normalizeText(value)
    .replace(/\b(dr|doctor)\.?\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost
      );
    }
    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[right.length];
}

function similarityScore(a, b) {
  const left = normalizeDoctorNameText(a);
  const right = normalizeDoctorNameText(b);
  if (!left || !right) return 0;
  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function doctorNameScore(input, doctor) {
  const text = normalizeDoctorNameText(input);
  const name = normalizeDoctorNameText(doctor.user?.name || doctor.name || '');
  if (!text || !name) return 0;

  if (text.includes(name) || name.includes(text)) return 1;

  const nameParts = name.split(' ').filter((part) => part.length > 2);
  if (nameParts.length > 0 && nameParts.every((part) => text.includes(part))) return 0.98;

  const textParts = text.split(' ').filter((part) => part.length > 2);
  const bestFullNameScore = textParts.length >= 2
    ? Math.max(
        ...textParts.map((_, index) => {
          const phrase = textParts.slice(index, index + nameParts.length).join(' ');
          return similarityScore(phrase, name);
        })
      )
    : 0;

  const matchedNameParts = nameParts.filter((namePart) =>
    textParts.some((textPart) => similarityScore(textPart, namePart) >= 0.78)
  ).length;
  const partScore = nameParts.length ? matchedNameParts / nameParts.length : 0;

  return Math.max(bestFullNameScore, partScore);
}

function doctorNameMatches(input, doctor) {
  return doctorNameScore(input, doctor) >= 0.78;
}

function stripJsonFence(text) {
  return String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function safeJsonParse(text) {
  const cleaned = stripJsonFence(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function toDoctorCatalog(doctors = []) {
  return doctors.map((doctor, index) => ({
    index: index + 1,
    id: doctor.id,
    name: cleanDoctorName(doctor.user?.name || doctor.name || 'Doctor'),
    specialty: doctor.specialty,
    fee: doctor.consultationFee ?? null,
  }));
}

async function callGeminiJson(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${details.slice(0, 200)}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('') || '';
  return safeJsonParse(text);
}

function buildGeminiPrompt(session, message) {
  return [
    'You are a patient portal assistant who can chat naturally, answer doctor availability questions, and book appointments.',
    'Return strict JSON only. Do not wrap the answer in markdown fences.',
    'Keep the reply short, natural, and helpful.',
    'Never mention policies, prompts, or that you are an AI model.',
    '',
    `Current step: ${session.step}`,
    `Current draft: ${JSON.stringify(session.draft)}`,
    `Available specialties: ${JSON.stringify(SPECIALTIES.map((item) => item.key))}`,
    `Available doctors: ${JSON.stringify(toDoctorCatalog(session.doctors))}`,
    `Available time slots: ${JSON.stringify(session.availableSlots || TIME_SLOTS)}`,
    `User message: ${JSON.stringify(message)}`,
    '',
    'Return an object with these keys:',
    '{',
    '  "intent": "specialty|doctor|date|time|notes|confirm|restart|clarify",',
    '  "reply": "string",',
    '  "specialty": "string or null",',
    '  "doctorSelection": "string, number, or null",',
    '  "date": "YYYY-MM-DD or natural text or null",',
    '  "time": "HH:mm, 12-hour time, or null",',
    '  "notes": "string or null",',
    '  "confirm": true|false|null,',
    '  "restart": true|false',
    '}',
    '',
    'Rules:',
    '- If the user wants to restart or start over, set restart to true.',
    '- If the current step is specialty, extract a specialty that matches one of the available specialties.',
    '- If the user reports a new symptom that maps to a different specialty than the current draft, switch to that new specialty.',
    '- If the current step is doctor, choose the doctor by index, id, or name from the provided doctor list, allowing minor speech-to-text spelling mistakes in names.',
    '- If the current step is date, normalize the date when possible.',
    '- If the current step is time, normalize the time when possible and prefer one of the available time slots.',
    '- If the current step is notes, store the note text unless the user says skip, none, no, or n/a.',
    '- If the current step is confirm, set confirm true for yes, confirm, book, or proceed and false for no, change, edit, or back.',
    '- If information is missing, set intent to clarify and ask for exactly the next piece of information.',
  ].join('\n');
}

function buildGeminiVoicePrompt(session, message) {
  const slots = (session.availableSlots?.length ? session.availableSlots : TIME_SLOTS).map(formatTimeDisplay);
  return [
    'You are a warm, friendly phone receptionist at Arogya Nidhi hospital helping a patient book a doctor appointment over a voice call.',
    'The caller may speak Nepali, English, or a mix of both. You MUST detect their language and reply in the SAME language.',
    'Return strict JSON only. No markdown fences.',
    'Your "reply" must sound natural when spoken aloud — short conversational sentences, no numbered lists, no bullet points.',
    '',
    'LANGUAGE RULES (highest priority):',
    '- Detect the language of "Patient said". If it contains Nepali words or Devanagari script → reply in Nepali.',
    '- If it is in English → reply in English.',
    '- If mixed, use the dominant language.',
    '- For medical/specialty terms with no Nepali equivalent (Cardiology, Neurology, Dermatology, Orthopedics, Pediatrics), use the English term even inside a Nepali sentence.',
    '- Use natural contractions: English (I\'ll, I\'ve, you\'re) or Nepali (गर्नुहोस्, हुन्छ, etc.).',
    '- Never say "Option 1", "Please say the doctor number", or read a structured list aloud.',
    '',
    `Current booking step: ${session.step}`,
    `Booking info collected so far: ${JSON.stringify(session.draft)}`,
    `Available specialties: ${JSON.stringify(SPECIALTIES.map((s) => s.key))}`,
    `Available doctors: ${JSON.stringify(toDoctorCatalog(session.doctors))}`,
    `Available time slots (reference only — do not read all aloud): ${JSON.stringify(slots)}`,
    `Patient said: ${JSON.stringify(message)}`,
    '',
    'Return:',
    '{',
    '  "intent": "specialty|doctor|date|time|notes|confirm|restart|clarify",',
    '  "detectedLanguage": "ne" or "en",',
    '  "reply": "natural spoken reply under 35 words in the detected language",',
    '  "specialty": "string or null",',
    '  "doctorSelection": "string, number, or null",',
    '  "date": "YYYY-MM-DD or natural text or null",',
    '  "time": "HH:mm or null",',
    '  "notes": "string or null",',
    '  "confirm": true|false|null,',
    '  "restart": true|false',
    '}',
    '',
    'Rules:',
    '- Sound like a human receptionist on a phone call, not a voice menu.',
    '- If the patient mentions symptoms, infer the right specialty (मुटु दुख्यो / chest pain → Cardiology, टाउको दुख्यो / headache → Neurology, etc.).',
    '- If the patient changes symptoms before confirmation, switch to the new matching specialty and forget the previous doctor/date/time draft.',
    '- Extract multiple fields at once when possible.',
    '- When listing doctors, say their names naturally. Nepali example: "Doctor Smith र Doctor Jones उपलब्ध छन्, कुन रोज्नुहुन्छ?"',
    '- Treat close speech-to-text name variants as the intended listed doctor when the match is clear.',
    '- When listing time slots, group them naturally. Nepali example: "बिहान ९ र १० बजे, वा दिउँसो २ बजे उपलब्ध छ।"',
    '- When confirming, mention doctor, date, and time in one natural sentence.',
    '- Keep reply under 35 words.',
  ].join('\n');
}

function normalizeAssistantPlan(plan) {
  if (!plan || typeof plan !== 'object') return null;

  return {
    intent: typeof plan.intent === 'string' ? plan.intent.trim().toLowerCase() : '',
    detectedLanguage: typeof plan.detectedLanguage === 'string' ? plan.detectedLanguage.trim().toLowerCase() : null,
    reply: typeof plan.reply === 'string' ? plan.reply.trim() : '',
    specialty: typeof plan.specialty === 'string' ? plan.specialty.trim() : null,
    doctorSelection: typeof plan.doctorSelection === 'string' || typeof plan.doctorSelection === 'number' ? plan.doctorSelection : null,
    date: typeof plan.date === 'string' ? plan.date.trim() : null,
    time: typeof plan.time === 'string' ? plan.time.trim() : null,
    notes: typeof plan.notes === 'string' ? plan.notes.trim() : null,
    confirm: typeof plan.confirm === 'boolean' ? plan.confirm : null,
    restart: Boolean(plan.restart) || plan.intent === 'restart',
  };
}

function replyForStage(plan, fallbackReply) {
  return plan?.reply || fallbackReply;
}

function resolveSpecialtyCandidate(value) {
  if (!value) return null;
  const text = normalizeText(value);
  return SPECIALTIES.find((item) => [item.key, item.label, ...item.synonyms].some((needle) => text.includes(normalizeText(needle)))) || null;
}

function findSpecialty(input) {
  const text = normalizeText(input);
  return SPECIALTIES.find((item) => [item.key, item.label, ...item.synonyms].some((needle) => text.includes(normalizeText(needle)))) || null;
}

function detectSymptomTriage(input) {
  const text = normalizeText(input);
  if (!text) return null;

  const matched = TRIAGE_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(normalizeText(keyword))));
  if (!matched) return null;

  const specialty = SPECIALTIES.find((item) => item.key === matched.specialty);
  if (!specialty) return null;

  return {
    specialty,
    causeHint: matched.causeHint,
    urgencyLevel: matched.urgencyLevel,
    confidenceScore: matched.confidenceScore,
    aiReasoning: matched.aiReasoning,
  };
}

function buildInferredTriage(specialty, input) {
  if (!specialty) return null;

  const rule = TRIAGE_RULES.find((item) => item.specialty === specialty.key);
  return {
    specialty,
    causeHint:
      rule?.causeHint ||
      `Your symptoms may be related to ${specialty.label.toLowerCase()} care.`,
    urgencyLevel: rule?.urgencyLevel || 'medium',
    confidenceScore: rule?.confidenceScore ? Math.min(rule.confidenceScore, 0.76) : 0.72,
    aiReasoning:
      rule?.aiReasoning ||
      `The assistant interpreted the symptom description as most consistent with ${specialty.label}. Patient described: ${String(input || '').slice(0, 240)}`,
  };
}

function detectRequestedSpecialty(input, plan = null) {
  const triage = detectSymptomTriage(input);
  const plannedSpecialty = resolveSpecialtyCandidate(plan?.specialty);
  const textSpecialty = findSpecialty(input);
  const specialty = plannedSpecialty || textSpecialty || triage?.specialty;
  if (!specialty) return null;

  const inferredTriage = triage || (plannedSpecialty && !textSpecialty ? buildInferredTriage(specialty, input) : null);
  return { specialty, triage: inferredTriage };
}

function mentionsBookingIntent(input) {
  const text = normalizeText(input);
  return /\b(book|appointment|schedule|consult|visit)\b/.test(text);
}

function isIdentityQuestion(input) {
  const text = normalizeText(input);
  return /\b(who are you|what are you|what can you do|how can you help|help me|what do you do)\b/.test(text);
}

function isGreeting(input) {
  const text = normalizeText(input);
  return /^(hi|hello|hey|namaste|good morning|good afternoon|good evening)\b/.test(text);
}

function isThanks(input) {
  const text = normalizeText(input);
  return /\b(thanks|thank you|thankyou)\b/.test(text);
}

function isAvailabilityQuestion(input) {
  const text = normalizeText(input);
  return /\b(available|availability|slot|slots|time|times|when|schedule|free)\b/.test(text);
}

function hasAnyPhrase(text, phrases = []) {
  return phrases.some((phrase) => text.includes(phrase));
}

function isPositiveConfirmation(input) {
  const text = normalizeText(input).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  if (['yes', 'yep', 'yeah', 'ok', 'okay', 'sure', 'confirm', 'proceed'].includes(text)) return true;

  return hasAnyPhrase(text, [
    'yes book',
    'book it',
    'confirm it',
    'just confirm',
    'go ahead',
    'go on',
    'please book',
    'book the appointment',
    'confirm booking',
    'confirm the booking',
    'confirm appointment',
    'confirm the appointment',
    'make the booking',
    'schedule it',
    'do it',
    'that works',
    'sounds good',
  ]);
}

function isNegativeConfirmation(input) {
  const text = normalizeText(input).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  if (['no', 'nope', 'nah', 'change', 'edit', 'back', 'cancel'].includes(text)) return true;

  return hasAnyPhrase(text, [
    'do not',
    'dont',
    "don't",
    'not now',
    'change it',
    'change doctor',
    'change date',
    'change time',
    'start over',
    'cancel it',
  ]);
}

function formatDoctorList(doctors = []) {
  return doctors
    .map((doctor, index) => {
      const doctorName = cleanDoctorName(doctor.user?.name || doctor.name || 'Doctor');
      return `${index + 1}. Doctor ${doctorName}`;
    })
    .join(', ');
}

function parseDateInput(input) {
  const text = normalizeText(input).replace(/-/g, ' ');
  const now = new Date();
  const date = new Date(now);

  if (text.includes('day after tomorrow') || text.includes('after tomorrow')) {
    date.setDate(date.getDate() + 2);
    return date;
  }
  if (text.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
    return date;
  }
  if (text.includes('today')) return now;

  const iso = String(input || '').match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return new Date(`${iso[1]}T00:00:00`);

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

function resolveDateCandidate(plan, fallbackText) {
  return parseDateInput(fallbackText) || parseDateInput(plan?.date);
}

function formatDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(dateKey) {
  if (!dateKey) return '-';
  const [year, month, day] = String(dateKey).split('-').map((value) => Number(value));
  if (!year || !month || !day) return dateKey;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function parseTimeInput(input) {
  const text = normalizeText(input).replace(/\./g, '');
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || '0');
  const meridiem = match[3];

  if (meridiem) {
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function resolveTimeCandidate(plan, fallbackText) {
  return parseTimeInput(fallbackText) || parseTimeInput(plan?.time);
}

function formatTimeDisplay(timeKey) {
  if (!timeKey) return '-';
  const [hourPart, minutePart] = String(timeKey).split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return timeKey;
  const displayHour = hour % 12 || 12;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function parseDoctorChoice(input, doctors = []) {
  const text = normalizeText(input);
  const exactDoctor = doctors.find((doctor) => normalizeText(doctor.id) === text || normalizeText(doctor._id) === text || text === `doctor:${normalizeText(doctor.id)}`);
  if (exactDoctor) return exactDoctor;

  const indexMatch = text.match(/\b(\d{1,2})\b/);
  if (indexMatch) {
    const idx = Number(indexMatch[1]) - 1;
    if (doctors[idx]) return doctors[idx];
  }

  return findBestDoctorNameMatch(input, doctors);
}

function findBestDoctorNameMatch(input, doctors = []) {
  const ranked = doctors
    .map((doctor) => ({ doctor, score: doctorNameScore(input, doctor) }))
    .filter((entry) => entry.score >= 0.78)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return null;
  if (ranked.length > 1 && ranked[0].score - ranked[1].score < 0.08) return null;
  return ranked[0].doctor;
}

function resolveDoctorCandidate(plan, doctors = [], fallbackText = '') {
  const candidate = plan?.doctorSelection;
  const exactText = normalizeText(candidate);

  if (exactText) {
    const byId = doctors.find((doctor) => normalizeText(doctor.id) === exactText || normalizeText(doctor._id) === exactText || exactText === `doctor:${normalizeText(doctor.id)}`);
    if (byId) return byId;

    const numeric = Number(exactText);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= doctors.length) {
      return doctors[numeric - 1];
    }

    const byName = findBestDoctorNameMatch(exactText, doctors);
    if (byName) return byName;
  }

  return parseDoctorChoice(fallbackText, doctors);
}

function getConfirmHint(draft, options = {}) {
  const dateText = formatDateDisplay(draft.date);
  const timeText = formatTimeDisplay(draft.time);
  const doctorText = draft.doctorName || '-';
  return forChannel(
    `Please confirm: Dr. ${doctorText}, ${dateText} at ${timeText}. Reply yes to book or no to change details.`,
    `Alright! I've got you set up with Doctor ${doctorText} on ${dateText} at ${timeText}. Shall I go ahead and book that?`,
    options
  );
}

function makeSpecialtyPrompt(options = {}) {
  return {
    reply: forChannel(
      `I can help you check doctor availability and book appointments. Tell me the specialty you need: ${formatSpecialtyList()}.`,
      "I can help with that. What kind of doctor are you looking to see?",
      options
    ),
    stage: 'specialty',
    actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
  };
}

function makeDoctorPrompt(doctors, options = {}) {
  const actions = doctors.map((doctor, index) => {
    const doctorName = cleanDoctorName(doctor.user?.name || doctor.name || 'Doctor');
    const feeText = doctor.consultationFee ? ` · Rs ${doctor.consultationFee}` : '';
    return buildAction('doctor', `${index + 1}. Dr. ${doctorName}${feeText}`, doctor.id, {
      doctorName,
      specialty: doctor.specialty,
    });
  });

  if (!doctors.length) {
    return {
      reply: forChannel(
        'I could not find a doctor for that specialty. Choose another specialty.',
        "I couldn't find an available doctor for that specialty. Would you like to try a different one?",
        options
      ),
      stage: 'specialty',
      actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
    };
  }

  if (getChannel(options) === 'voice') {
    const names = doctors
      .slice(0, 4)
      .map((d) => `Doctor ${cleanDoctorName(d.user?.name || d.name || 'Doctor')}`);
    const nameText =
      names.length === 1
        ? names[0]
        : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
    return {
      reply: `I've got ${nameText} available. Any preference?`,
      stage: 'doctor',
      actions,
    };
  }

  return {
    reply: 'I found these available doctors. Pick one by number or tap a doctor.',
    stage: 'doctor',
    actions,
  };
}

function buildTriageReply(triage) {
  if (!triage) return '';
  return `${triage.causeHint} Please consult a ${triage.specialty.label}. Here are available ${triage.specialty.label} professionals you can choose from.`;
}

async function recordAssistantTriageDecision(userId, symptomText, triage) {
  const decision = makeTriageDecisionPayload(triage, symptomText);

  try {
    const result = await dashboardService.recordTriageDecision(userId, {
      title: `AI triage: ${decision.recommendedSpecialty}`,
      symptomText,
      recommendedSpecialty: decision.recommendedSpecialty,
      urgencyLevel: decision.urgencyLevel,
      confidenceScore: decision.confidenceScore,
      aiReasoning: decision.aiReasoning,
    });

    return {
      ...decision,
      id: result.triageDecision?.id || null,
      queryId: result.query?.id || result.triageDecision?.query_id || null,
      persisted: true,
    };
  } catch (error) {
    console.warn('Failed to record assistant triage decision', error?.message || error);
    return {
      ...decision,
      persisted: false,
      error: error?.message || 'Failed to save triage decision',
    };
  }
}

async function applySpecialtyToSession(session, specialty) {
  session.draft.specialty = specialty.key;
  session.draft.doctorId = null;
  session.draft.doctorName = null;
  session.draft.date = null;
  session.draft.time = null;
  session.draft.notes = null;
  session.availableSlots = [...TIME_SLOTS];

  const doctorsResult = await dashboardService.getAvailableDoctors({
    specialty: specialty.key,
    page: 1,
    limit: 10,
  });
  session.doctors = doctorsResult.doctors || [];
  session.step = session.doctors.length ? 'doctor' : 'specialty';
  return session.doctors;
}

async function makeSpecialtyDoctorsReply(session, specialty, triage, options = {}) {
  const doctors = await applySpecialtyToSession(session, specialty);

  if (!doctors.length) {
    session.draft.specialty = null;
    return {
      reply: forChannel(
        `I could not find a doctor for ${specialty.label}. Please choose another specialty.`,
        `I'm sorry, I couldn't find an available ${specialty.label} right now. Can I help you with a different specialty?`,
        options
      ),
      stage: 'specialty',
      actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
    };
  }

  const prompt = makeDoctorPrompt(doctors, options);
  const triageReply = triage && triage.specialty.key === specialty.key ? buildTriageReply(triage) : "";

  // The triage decision is now recorded centrally in processMessage
  const triageDecision = options.triageDecision || null;

  const replyParts = [triageReply, prompt.reply].filter(Boolean);

  return {
    ...prompt,
    reply: replyParts.join('\n\n'),
    ...(triageDecision ? { triageDecision } : {}),
  };
}

function makeDatePrompt(session, options = {}) {
  return {
    reply: forChannel(
      `Great. Which date would you like for Dr. ${cleanDoctorName(session.draft.doctorName)}? You can type YYYY-MM-DD or use a quick option.`,
      `Great choice! When would you like to come in to see Doctor ${cleanDoctorName(session.draft.doctorName)}?`,
      options
    ),
    stage: 'date',
    actions: [
      buildAction('date', 'Today', 'today'),
      buildAction('date', 'Tomorrow', 'tomorrow'),
      buildAction('date', 'Day after tomorrow', 'day-after-tomorrow'),
    ],
  };
}

function makeTimePrompt(session, options = {}) {
  const slots = session.availableSlots?.length ? session.availableSlots : TIME_SLOTS;

  let voiceSlotText;
  if (getChannel(options) === 'voice') {
    const morning = slots.filter((s) => parseInt(s, 10) < 12);
    const afternoon = slots.filter((s) => parseInt(s, 10) >= 12);
    if (morning.length && afternoon.length) {
      voiceSlotText = `morning slots at ${morning.map(formatTimeDisplay).join(' and ')}, or afternoon at ${afternoon.map(formatTimeDisplay).join(' and ')}`;
    } else {
      voiceSlotText = slots.map(formatTimeDisplay).join(', ');
    }
  }

  return {
    reply: forChannel(
      'Now choose a time. You can type a time like 10:00 AM or tap one of the suggested slots.',
      `What time works best? I have ${voiceSlotText}.`,
      options
    ),
    stage: 'time',
    actions: slots.map((slot) => buildAction('time', slot, slot)),
  };
}

function makeNotesPrompt(options = {}) {
  return {
    reply: forChannel(
      'Optional: add a short note for the doctor, or type skip to continue.',
      "Is there anything you'd like the doctor to know beforehand, or shall I go ahead?",
      options
    ),
    stage: 'notes',
    actions: [buildAction('notes', 'Skip notes', 'skip')],
  };
}

function makeSummaryPrompt(session, options = {}) {
  return {
    reply: getConfirmHint({ ...session.draft, doctorName: cleanDoctorName(session.draft.doctorName) }, options),
    stage: 'confirm',
    bookingPreview: { ...session.draft },
    actions: [
      buildAction('confirm', 'Confirm booking', 'yes'),
      buildAction('restart', 'Start over', 'restart'),
    ],
  };
}

function getInitialPrompt(options = {}) {
  if (getChannel(options) === 'voice') {
    return {
      reply: "नमस्ते! अरोग्य निधिमा कल गर्नुभएकोमा धन्यवाद। Hello! Thank you for calling Arogya Nidhi. म तपाईंको appointment assistant हुँ। तपाईं नेपाली वा English मा बोल्न सक्नुहुन्छ। आज कसरी सहयोग गरौं?",
      stage: 'specialty',
      actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
    };
  }
  return makeSpecialtyPrompt(options);
}

function maybeHandleGeneralConversation(text, session, options = {}) {
  const normalized = normalizeText(text);
  const hasMedicalOrBookingSignal =
    Boolean(findSpecialty(text)) ||
    Boolean(detectSymptomTriage(text)) ||
    mentionsBookingIntent(text) ||
    isAvailabilityQuestion(text);

  if (hasMedicalOrBookingSignal) {
    return null;
  }

  if (isIdentityQuestion(normalized)) {
    return {
      reply: forChannel(
        'I am your patient portal assistant. I can answer basic questions, help you check doctor availability, and book an appointment when you are ready.',
        "I'm your appointment assistant at Arogya Nidhi. I can help you find a doctor and book an appointment. What do you need today?",
        options
      ),
      stage: session.step || 'specialty',
      actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
    };
  }

  if (isGreeting(normalized)) {
    return {
      reply: forChannel(
        'Hello. I can help you find a doctor, check availability, or book an appointment. Which specialty are you looking for?',
        "Hello! Great to hear from you. I can help you book a doctor's appointment. What kind of specialist are you looking for?",
        options
      ),
      stage: 'specialty',
      actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
    };
  }

  if (isThanks(normalized)) {
    return {
      reply: forChannel(
        'You are welcome. If you want, I can help you check availability or continue with a booking.',
        "You're welcome! Is there anything else I can help you with today?",
        options
      ),
      stage: session.step || 'specialty',
      actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
    };
  }

  return null;
}

async function maybeHandleAvailabilityQuestion(text, session, options = {}) {
  if (!isAvailabilityQuestion(text)) {
    return null;
  }

  const specialty = findSpecialty(text) || resolveSpecialtyCandidate(session.draft.specialty);
  if (!specialty) {
    return {
      reply: forChannel(
        'I can check doctor availability. Tell me the specialty first, for example Cardiology or Neurology.',
        'I can check doctor availability. Please say the specialty first, for example Cardiology or Neurology.',
        options
      ),
      stage: 'specialty',
      actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
    };
  }

  const doctorsResult = await dashboardService.getAvailableDoctors({
    specialty: specialty.key,
    page: 1,
    limit: 5,
  });
  const doctors = doctorsResult.doctors || [];

  if (!doctors.length) {
    return {
      reply: forChannel(
        `I could not find any available ${specialty.label} right now. Try another specialty.`,
        `I could not find any available ${specialty.label} right now. Please try another specialty.`,
        options
      ),
      stage: 'specialty',
      actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
    };
  }

  const requestedDoctor = parseDoctorChoice(text, doctors);
  const requestedDate = parseDateInput(text);

  if (requestedDoctor && requestedDate) {
    const dateKey = formatDateKey(requestedDate);
    const availability = await dashboardService.getDoctorAvailability({
      doctorId: requestedDoctor.id,
      date: dateKey,
    });
    const slotText = (availability.slots || []).length
      ? availability.slots.map(formatTimeDisplay).join(', ')
      : 'no open slots';

    return {
      reply: forChannel(
        `On ${formatDateDisplay(dateKey)}, Dr. ${cleanDoctorName(requestedDoctor.user?.name || requestedDoctor.name)} has ${slotText}.`,
        `On ${formatDateDisplay(dateKey)}, Doctor ${cleanDoctorName(requestedDoctor.user?.name || requestedDoctor.name)} has ${slotText}.`,
        options
      ),
      stage: 'time',
      actions: (availability.slots || []).map((slot) => buildAction('time', slot, slot)),
    };
  }

  if (requestedDoctor && !requestedDate) {
    return {
      reply: forChannel(
        `I can check Dr. ${cleanDoctorName(requestedDoctor.user?.name || requestedDoctor.name)}'s times. Tell me a date like today, tomorrow, or 2026-04-24.`,
        `I can check Doctor ${cleanDoctorName(requestedDoctor.user?.name || requestedDoctor.name)}'s times. Please say a date like today, tomorrow, or 2026-04-24.`,
        options
      ),
      stage: 'date',
      actions: [
        buildAction('date', 'Today', 'today'),
        buildAction('date', 'Tomorrow', 'tomorrow'),
      ],
    };
  }

  if (requestedDate) {
    const dateKey = formatDateKey(requestedDate);
    const summaries = [];

    for (const doctor of doctors.slice(0, 3)) {
      const availability = await dashboardService.getDoctorAvailability({
        doctorId: doctor.id,
        date: dateKey,
      });
      const slotPreview = (availability.slots || []).slice(0, 3).map(formatTimeDisplay).join(', ');
      summaries.push(
        `Doctor ${cleanDoctorName(doctor.user?.name || doctor.name)}${slotPreview ? `: ${slotPreview}` : ': no open slots'}`
      );
    }

    return {
      reply: `${formatDateDisplay(dateKey)} availability for ${specialty.label}: ${summaries.join('. ')}.`,
      stage: 'doctor',
      actions: doctors.map((doctor, index) => {
        const doctorName = cleanDoctorName(doctor.user?.name || doctor.name || 'Doctor');
        const feeText = doctor.consultationFee ? ` · Rs ${doctor.consultationFee}` : '';
        return buildAction('doctor', `${index + 1}. Dr. ${doctorName}${feeText}`, doctor.id, {
          doctorName,
          specialty: doctor.specialty,
        });
      }),
    };
  }

  return {
    reply: forChannel(
      `Available ${specialty.label} include ${formatDoctorList(doctors)}. If you want exact times, tell me a date like today or tomorrow.`,
      `Available ${specialty.label} include ${formatDoctorList(doctors)}. If you want exact times, please say a date like today or tomorrow.`,
      options
    ),
    stage: 'doctor',
    actions: doctors.map((doctor, index) => {
      const doctorName = cleanDoctorName(doctor.user?.name || doctor.name || 'Doctor');
      const feeText = doctor.consultationFee ? ` · Rs ${doctor.consultationFee}` : '';
      return buildAction('doctor', `${index + 1}. Dr. ${doctorName}${feeText}`, doctor.id, {
        doctorName,
        specialty: doctor.specialty,
      });
    }),
  };
}

async function refreshAvailability(session) {
  const availability = await dashboardService.getDoctorAvailability({
    doctorId: session.draft.doctorId,
    date: session.draft.date,
  });
  session.availableSlots = availability.slots || [];
}

async function processMessage(userId, message, options = {}) {
  const text = String(message || '').trim();
  if (!text) {
    return {
      reply: forChannel(
        'Please type a message so I can help you book an appointment.',
        'Please say something so I can help you book an appointment.',
        options
      ),
      stage: 'specialty',
      actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
    };
  }

  const sessionKey = getSessionKey(userId, options);
  const session = getSession(sessionKey);
  const normalized = normalizeText(text);
  let plan = null;

  try {
    const geminiPrompt = getChannel(options) === "voice"
      ? buildGeminiVoicePrompt(session, text)
      : buildGeminiPrompt(session, text);
    plan = normalizeAssistantPlan(await callGeminiJson(geminiPrompt));
  } catch (error) {
    console.error("Gemini call failed:", error);
    plan = null;
  }

  // Detect and record triage decision early
  const requested = detectRequestedSpecialty(text, plan);
  let triageDecision = null;
  if (requested?.triage) {
    triageDecision = await recordAssistantTriageDecision(userId, text, requested.triage);
  }

  const enhancedOptions = { ...options, userId, symptomText: text, triageDecision };

  if (plan?.restart || ['restart', 'start over', 'reset', 'clear'].some((keyword) => normalized.includes(keyword))) {
    resetSession(sessionKey);
    return makeSpecialtyPrompt(options);
  }

  const generalConversationReply = maybeHandleGeneralConversation(text, session, enhancedOptions);
  if (generalConversationReply) {
    return { ...generalConversationReply, triageDecision };
  }

  if (!session.draft.doctorId && !mentionsBookingIntent(text)) {
    const availabilityReply = await maybeHandleAvailabilityQuestion(text, session, enhancedOptions);
    if (availabilityReply) {
      return { ...availabilityReply, triageDecision };
    }
  }

  const currentSpecialty = resolveSpecialtyCandidate(session.draft.specialty);
  const shouldSwitchSpecialty =
    requested?.specialty &&
    currentSpecialty &&
    requested.specialty.key !== currentSpecialty.key &&
    session.step !== 'confirm';

  if (shouldSwitchSpecialty) {
    return makeSpecialtyDoctorsReply(session, requested.specialty, requested.triage, enhancedOptions);
  }

  if (!session.draft.specialty) {
    if (!requested?.specialty) {
      const prompt = makeSpecialtyPrompt(enhancedOptions);
      return { ...prompt, reply: replyForStage(plan, prompt.reply), triageDecision };
    }

    return makeSpecialtyDoctorsReply(session, requested.specialty, requested.triage, enhancedOptions);
  }

  if (!session.draft.doctorId) {
    const doctor = resolveDoctorCandidate(plan, session.doctors, text) ||
      (session.doctors.length === 1 && mentionsBookingIntent(text) ? session.doctors[0] : null);
    if (!doctor) {
      const prompt = makeDoctorPrompt(session.doctors, enhancedOptions);
      return { ...prompt, reply: replyForStage(plan, prompt.reply), triageDecision };
    }

    session.draft.doctorId = doctor.id;
    session.draft.doctorName = cleanDoctorName(doctor.user?.name || doctor.name || 'Doctor');
    session.step = 'date';
    const prompt = makeDatePrompt(session, enhancedOptions);
    return { ...prompt, triageDecision };
  }

  if (!session.draft.date) {
    const date = resolveDateCandidate(plan, text);
    if (!date) {
      const prompt = makeDatePrompt(session, enhancedOptions);
      return { ...prompt, reply: replyForStage(plan, prompt.reply), triageDecision };
    }

    session.draft.date = formatDateKey(date);
    await refreshAvailability(session);

    if (!session.availableSlots.length) {
      session.draft.date = null;
      const prompt = makeDatePrompt(session, options);
      return {
        ...prompt,
        reply: forChannel(
          'That date has no available slots. Please choose another date.',
          "Hmm, it looks like there are no open slots on that day. Could you try a different date?",
          options
        ),
      };
    }

    session.step = 'time';
    const prompt = makeTimePrompt(session, enhancedOptions);
    return { ...prompt, reply: replyForStage(plan, prompt.reply), triageDecision };
  }

  if (!session.draft.time) {
    const time = resolveTimeCandidate(plan, text);
    if (!time || !session.availableSlots.includes(time)) {
      const prompt = makeTimePrompt(session, options);
      return {
        ...prompt,
        reply: time && !session.availableSlots.includes(time)
          ? forChannel(
              'That time is not available. Please choose one of the suggested slots.',
              "That slot isn't available, I'm afraid. Could you pick a different time?",
              options
            )
          : replyForStage(plan, prompt.reply),
      };
    }

    session.draft.time = time;
    session.step = 'notes';
    const prompt = makeNotesPrompt(enhancedOptions);
    return { ...prompt, reply: replyForStage(plan, prompt.reply), triageDecision };
  }

  if (!session.draft.notes && session.step === 'notes') {
    if (plan?.notes && !['skip', 'no', 'none', 'n/a'].includes(normalizeText(plan.notes))) {
      session.draft.notes = plan.notes;
    } else if (['skip', 'no', 'none', 'n/a'].includes(normalized) || ['skip', 'no', 'none', 'n/a'].includes(normalizeText(plan?.notes))) {
      session.draft.notes = null;
    } else {
      session.draft.notes = plan?.notes || text;
    }

    session.step = 'confirm';
    const prompt = makeSummaryPrompt(session, enhancedOptions);
    return { ...prompt, reply: replyForStage(plan, prompt.reply), triageDecision };
  }

  if (session.step === 'confirm') {
    const positiveConfirmation = plan?.confirm === true || isPositiveConfirmation(text);
    const negativeConfirmation = plan?.confirm === false || isNegativeConfirmation(text);

    if (positiveConfirmation) {
      const scheduledAt = new Date(`${session.draft.date}T${session.draft.time}:00`);
      try {
        const booking = await dashboardService.bookAppointment(userId, {
          doctorId: session.draft.doctorId,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: 30,
          patientNotes: session.draft.notes || null,
        }, {
          status: 'CONFIRMED',
        });
        resetSession(sessionKey);
        return {
          reply: forChannel(
            `Your appointment is confirmed with Dr. ${cleanDoctorName(booking.doctor?.user?.name || session.draft.doctorName)} on ${formatDateDisplay(session.draft.date)} at ${formatTimeDisplay(session.draft.time)}.`,
            `Perfect, you're all set! Doctor ${cleanDoctorName(booking.doctor?.user?.name || session.draft.doctorName)} will see you on ${formatDateDisplay(session.draft.date)} at ${formatTimeDisplay(session.draft.time)}. See you then!`,
            options
          ),
          stage: 'done',
          booking,
          actions: [buildAction('restart', 'Book another appointment', 'restart')],
        };
      } catch (error) {
        if (error?.status === 400 && String(error.message || '').toLowerCase().includes('slot already booked')) {
          await refreshAvailability(session);
          session.step = 'time';
          session.draft.time = null;
          return {
            reply: forChannel(
              `${error.message} Please choose another time slot.`,
              `${error.message} Please say another available time slot.`,
              options
            ),
            stage: 'time',
            actions: session.availableSlots.map((slot) => buildAction('time', slot, slot)),
          };
        }

        return {
          reply: error?.message || 'I could not book the appointment. Please try again.',
          stage: 'confirm',
          bookingPreview: { ...session.draft },
          actions: [buildAction('confirm', 'Try again', 'yes'), buildAction('restart', 'Start over', 'restart')],
        };
      }
    }

    if (negativeConfirmation) {
      session.step = 'doctor';
      session.draft.date = null;
      session.draft.time = null;
      session.draft.notes = null;
      session.availableSlots = [...TIME_SLOTS];
      const prompt = makeDoctorPrompt(session.doctors, enhancedOptions);
      return { ...prompt, reply: replyForStage(plan, prompt.reply), triageDecision };
    }

    const prompt = makeSummaryPrompt(session, enhancedOptions);
    return { ...prompt, reply: replyForStage(plan, prompt.reply), triageDecision };
  }

  const prompt = makeSpecialtyPrompt(enhancedOptions);
  return { ...prompt, reply: replyForStage(plan, prompt.reply), triageDecision };
}

export default { processMessage, getInitialPrompt, resetSession };
