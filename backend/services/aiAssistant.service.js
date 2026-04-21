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
  },
  {
    specialty: 'Neurology',
    keywords: ['headache', 'migraine', 'dizziness', 'vertigo', 'seizure', 'numbness', 'tingling', 'memory loss'],
    causeHint: 'Possible reasons include migraine, nerve irritation, inner-ear imbalance, or other neurological causes.',
  },
  {
    specialty: 'Dermatology',
    keywords: ['rash', 'itching', 'itchy skin', 'acne', 'eczema', 'psoriasis', 'skin infection', 'hair fall'],
    causeHint: 'Possible reasons include allergy, infection, dermatitis, or inflammatory skin conditions.',
  },
  {
    specialty: 'Orthopedics',
    keywords: ['joint pain', 'knee pain', 'back pain', 'neck pain', 'shoulder pain', 'fracture', 'sprain', 'bone pain'],
    causeHint: 'Possible reasons include ligament strain, arthritis, disc issues, or minor bone and joint injury.',
  },
  {
    specialty: 'Pediatrics',
    keywords: ['my child', 'my baby', 'child has', 'baby has', 'infant', 'child fever', 'pediatric'],
    causeHint: 'Possible reasons vary by age and symptom, including viral infections and common pediatric illnesses.',
  },
];

const SESSIONS = new Map();
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

function getSession(userId) {
  if (!SESSIONS.has(userId)) {
    SESSIONS.set(userId, {
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
    });
  }
  return SESSIONS.get(userId);
}

function resetSession(userId) {
  SESSIONS.delete(userId);
}

function formatSpecialtyList() {
  return SPECIALTIES.map((s) => s.label).join(', ');
}

function buildAction(type, label, value, extra = {}) {
  return { type, label, value, ...extra };
}

function cleanDoctorName(name) {
  return String(name || 'Doctor').replace(/^dr\.?\s+/i, '').trim() || 'Doctor';
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
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
    'You are an appointment-booking assistant for a patient portal.',
    'Return strict JSON only. Do not wrap the answer in markdown fences.',
    'Keep the reply short, natural, and helpful.',
    'Never mention policies, prompts, or that you are an AI model.',
    '',
    `Current step: ${session.step}`,
    `Current draft: ${JSON.stringify(session.draft)}`,
    `Available specialties: ${JSON.stringify(SPECIALTIES.map((item) => item.key))}`,
    `Available doctors: ${JSON.stringify(toDoctorCatalog(session.doctors))}`,
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
    '- If the current step is doctor, choose the doctor by index, id, or name from the provided doctor list.',
    '- If the current step is date, normalize the date when possible.',
    '- If the current step is time, normalize the time when possible.',
    '- If the current step is notes, store the note text unless the user says skip, none, no, or n/a.',
    '- If the current step is confirm, set confirm true for yes/confirm/book and false for no/change/edit/back.',
    '- If information is missing, set intent to clarify and ask for exactly the next piece of information.',
  ].join('\n');
}

function normalizeAssistantPlan(plan) {
  if (!plan || typeof plan !== 'object') return null;

  return {
    intent: typeof plan.intent === 'string' ? plan.intent.trim().toLowerCase() : '',
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

function resolveSpecialtyCandidate(value) {
  if (!value) return null;
  const text = normalizeText(value);
  return SPECIALTIES.find((item) => [item.key, item.label, ...item.synonyms].some((needle) => text.includes(normalizeText(needle)))) || null;
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

    const byName = doctors.find((doctor) => {
      const doctorName = normalizeText(doctor.user?.name || doctor.name || '');
      return doctorName && (doctorName.includes(exactText) || exactText.includes(doctorName));
    });
    if (byName) return byName;
  }

  return parseDoctorChoice(fallbackText, doctors);
}

function resolveDateCandidate(plan, fallbackText) {
  return parseDateInput(fallbackText) || parseDateInput(plan?.date);
}

function resolveTimeCandidate(plan, fallbackText) {
  return parseTimeInput(fallbackText) || parseTimeInput(plan?.time);
}

function replyForStage(plan, fallbackReply) {
  return fallbackReply;
}

function normalizeText(text) {
  return String(text || '').trim().toLowerCase();
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
  };
}

function parseDateInput(input) {
  const text = normalizeText(input).replace(/-/g, ' ');
  const now = new Date();
  const date = new Date(now);

  if (text.includes('today')) return now;
  if (text.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
    return date;
  }
  if (text.includes('day after tomorrow') || text.includes('after tomorrow')) {
    date.setDate(date.getDate() + 2);
    return date;
  }

  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return new Date(`${iso[1]}T00:00:00`);

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

function formatDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(dateKey) {
  if (!dateKey) return '—';
  const [year, month, day] = String(dateKey).split('-').map((value) => Number(value));
  if (!year || !month || !day) return dateKey;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTimeDisplay(timeKey) {
  if (!timeKey) return '—';
  const [hourPart, minutePart] = String(timeKey).split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return timeKey;
  const displayHour = hour % 12 || 12;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
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

function parseDoctorChoice(input, doctors = []) {
  const text = normalizeText(input);
  const exactDoctor = doctors.find((doctor) => normalizeText(doctor.id) === text || normalizeText(doctor._id) === text || text === `doctor:${normalizeText(doctor.id)}`);
  if (exactDoctor) return exactDoctor;

  const indexMatch = text.match(/\b(\d{1,2})\b/);
  if (indexMatch) {
    const idx = Number(indexMatch[1]) - 1;
    if (doctors[idx]) return doctors[idx];
  }

  return doctors.find((doctor) => {
    const name = normalizeText(doctor.user?.name || doctor.name || '');
    return name && text.includes(name);
  }) || null;
}

function getConfirmHint(draft) {
  const dateText = formatDateDisplay(draft.date);
  const timeText = formatTimeDisplay(draft.time);
  const doctorText = draft.doctorName || '—';
  return `Please confirm: Dr. ${doctorText}, ${dateText} at ${timeText}. Reply yes to book or no to change details.`;
}

function makeSpecialtyPrompt() {
  return {
    reply: `I can help you book an appointment. Tell me the specialty you need: ${formatSpecialtyList()}.`,
    stage: 'specialty',
    actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
  };
}

function makeDoctorPrompt(doctors) {
  return {
    reply: doctors.length
      ? 'I found these available doctors. Pick one by number or tap a doctor.'
      : 'I could not find a doctor for that specialty. Choose another specialty.',
    stage: 'doctor',
    actions: doctors.map((doctor, index) => {
      const doctorName = cleanDoctorName(doctor.user?.name || doctor.name || 'Doctor');
      return buildAction('doctor', `${index + 1}. Dr. ${doctorName}${doctor.consultationFee ? ` · रु${doctor.consultationFee}` : ''}`, doctor.id, {
        doctorName,
      specialty: doctor.specialty,
      });
    }),
  };
}

function buildTriageReply(triage) {
  if (!triage) return '';
  return `${triage.causeHint} Please consult a ${triage.specialty.label}. Here are available ${triage.specialty.label} professionals you can choose from.`;
}

function makeDatePrompt(session) {
  return {
    reply: `Great. Which date would you like for Dr. ${cleanDoctorName(session.draft.doctorName)}? You can type YYYY-MM-DD or use a quick option.`,
    stage: 'date',
    actions: [
      buildAction('date', 'Today', 'today'),
      buildAction('date', 'Tomorrow', 'tomorrow'),
      buildAction('date', 'Day after tomorrow', 'day-after-tomorrow'),
    ],
  };
}

function makeTimePrompt() {
  return {
    reply: 'Now choose a time. You can type a time like 10:00 AM or tap one of the suggested slots.',
    stage: 'time',
    actions: TIME_SLOTS.map((slot) => buildAction('time', slot, slot)),
  };
}

function makeNotesPrompt() {
  return {
    reply: 'Optional: add a short note for the doctor, or type skip to continue.',
    stage: 'notes',
    actions: [
      buildAction('notes', 'Skip notes', 'skip'),
    ],
  };
}

function makeSummaryPrompt(session) {
  return {
    reply: getConfirmHint({ ...session.draft, doctorName: cleanDoctorName(session.draft.doctorName) }),
    stage: 'confirm',
    bookingPreview: { ...session.draft },
    actions: [
      buildAction('confirm', 'Confirm booking', 'yes'),
      buildAction('restart', 'Start over', 'restart'),
    ],
  };
}

async function processMessage(userId, message) {
  const text = String(message || '').trim();
  if (!text) {
    return { reply: 'Please type a message so I can help you book an appointment.', stage: 'specialty', actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)) };
  }

  const session = getSession(userId);
  const normalized = normalizeText(text);
  let plan = null;

  try {
    plan = normalizeAssistantPlan(await callGeminiJson(buildGeminiPrompt(session, text)));
  } catch {
    plan = null;
  }

  if (plan?.restart || ['restart', 'start over', 'reset', 'clear'].some((keyword) => normalized.includes(keyword))) {
    resetSession(userId);
    return makeSpecialtyPrompt();
  }

  if (!session.draft.specialty) {
    const triage = detectSymptomTriage(text);
    const specialty = resolveSpecialtyCandidate(plan?.specialty) || findSpecialty(text) || triage?.specialty;
    if (!specialty) {
      const prompt = makeSpecialtyPrompt();
      return {
        ...prompt,
        reply: replyForStage(plan, prompt.reply),
      };
    }

    session.draft.specialty = specialty.key;
    const doctorsResult = await dashboardService.getAvailableDoctors({ specialty: specialty.key, page: 1, limit: 10 });
    session.doctors = doctorsResult.doctors || [];

    if (!session.doctors.length) {
      session.draft.specialty = null;
      return {
        reply: `I could not find a doctor for ${specialty.label}. Please choose another specialty.`,
        stage: 'specialty',
        actions: SPECIALTIES.map((s) => buildAction('specialty', s.label, s.key)),
      };
    }

    session.step = 'doctor';
    const prompt = makeDoctorPrompt(session.doctors);
    const triageReply = triage && triage.specialty.key === specialty.key ? buildTriageReply(triage) : '';
    return {
      ...prompt,
      reply: triageReply ? `${triageReply} ${prompt.reply}` : replyForStage(plan, prompt.reply),
    };
  }

  if (!session.draft.doctorId) {
    const doctor = resolveDoctorCandidate(plan, session.doctors, text);
    if (!doctor) {
      const prompt = makeDoctorPrompt(session.doctors);
      return {
        ...prompt,
        reply: replyForStage(plan, prompt.reply),
      };
    }

    session.draft.doctorId = doctor.id;
    session.draft.doctorName = cleanDoctorName(doctor.user?.name || doctor.name || 'Doctor');
    session.step = 'date';
    const prompt = makeDatePrompt(session);
    return {
      ...prompt,
      reply: replyForStage(plan, prompt.reply),
    };
  }

  if (!session.draft.date) {
    const date = resolveDateCandidate(plan, text);
    if (!date) {
      const prompt = makeDatePrompt(session);
      return {
        ...prompt,
        reply: replyForStage(plan, prompt.reply),
      };
    }

    session.draft.date = formatDateKey(date);
    session.step = 'time';
    const prompt = makeTimePrompt();
    return {
      ...prompt,
      reply: replyForStage(plan, prompt.reply),
    };
  }

  if (!session.draft.time) {
    const time = resolveTimeCandidate(plan, text);
    if (!time) {
      const prompt = makeTimePrompt();
      return {
        ...prompt,
        reply: replyForStage(plan, prompt.reply),
      };
    }

    session.draft.time = time;
    session.step = 'notes';
    const prompt = makeNotesPrompt();
    return {
      ...prompt,
      reply: replyForStage(plan, prompt.reply),
    };
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
    const prompt = makeSummaryPrompt(session);
    return {
      ...prompt,
      reply: replyForStage(plan, prompt.reply),
    };
  }

  if (session.step === 'confirm') {
    const positiveConfirmation = plan?.confirm === true || ['yes', 'confirm', 'book', 'book it', 'proceed'].includes(normalized);
    const negativeConfirmation = plan?.confirm === false || ['no', 'change', 'edit', 'back'].includes(normalized);

    if (positiveConfirmation) {
      const scheduledAt = new Date(`${session.draft.date}T${session.draft.time}:00`);
      try {
        const booking = await dashboardService.bookAppointment(userId, {
          doctorId: session.draft.doctorId,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: 30,
          patientNotes: session.draft.notes || null,
        });
        resetSession(userId);
        return {
          reply: `Your appointment is confirmed with Dr. ${cleanDoctorName(booking.doctor?.user?.name || session.draft.doctorName)} on ${formatDateDisplay(session.draft.date)} at ${formatTimeDisplay(session.draft.time)}.`,
          stage: 'done',
          booking,
          actions: [buildAction('restart', 'Book another appointment', 'restart')],
        };
      } catch (error) {
        if (error?.status === 400 && String(error.message || '').toLowerCase().includes('slot already booked')) {
          session.step = 'time';
          session.draft.time = null;
          return {
            reply: `${error.message} Please choose another time slot.`,
            stage: 'time',
            actions: TIME_SLOTS.map((slot) => buildAction('time', slot, slot)),
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
      const prompt = makeDoctorPrompt(session.doctors);
      return {
        ...prompt,
        reply: replyForStage(plan, prompt.reply),
      };
    }

    const prompt = makeSummaryPrompt(session);
    return {
      ...prompt,
      reply: replyForStage(plan, prompt.reply),
    };
  }

  const prompt = makeSpecialtyPrompt();
  return {
    ...prompt,
    reply: replyForStage(plan, prompt.reply),
  };
}

export default { processMessage };