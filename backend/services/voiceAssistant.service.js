import { randomUUID } from 'crypto';
import aiAssistantService from './aiAssistant.service.js';
import patientRepo from '../repository/patient.repository.js';

const VOICE_SESSIONS = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000;

function touchSession(session) {
  session.updatedAt = new Date().toISOString();
  session.expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  return session;
}

function getSession(sessionId) {
  const session = VOICE_SESSIONS.get(sessionId);
  if (!session) {
    throw { status: 404, message: 'Voice session not found' };
  }
  if (new Date(session.expiresAt) <= new Date()) {
    VOICE_SESSIONS.delete(sessionId);
    aiAssistantService.resetSession(`voice:${sessionId}`);
    throw { status: 410, message: 'Voice session expired' };
  }
  return touchSession(session);
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '').trim();
}

async function resolvePatient({ patientUserId, phoneNumber }) {
  if (patientUserId) {
    const patient = await patientRepo.findPatientByUserId(patientUserId);
    if (patient) return patient;
  }

  const normalizedPhone = normalizePhone(phoneNumber);
  if (normalizedPhone) {
    const patient = await patientRepo.findPatientByPhone(normalizedPhone);
    if (patient) return patient;
  }

  return null;
}

function buildUnresolvedPatientReply() {
  return {
    reply: 'I could not identify the patient for this call. Please provide a valid patient user ID or caller phone number before continuing.',
    stage: 'patient_resolution',
    requiresPatientResolution: true,
  };
}

async function startSession({ sessionId, patientUserId, phoneNumber, initialTranscript } = {}) {
  const id = sessionId || randomUUID();
  const patient = await resolvePatient({ patientUserId, phoneNumber });

  const session = touchSession({
    id,
    patientUserId: patient?.user?.id || patientUserId || null,
    phoneNumber: normalizePhone(phoneNumber) || null,
    createdAt: new Date().toISOString(),
  });
  VOICE_SESSIONS.set(id, session);

  if (!patient) {
    return {
      sessionId: id,
      ...buildUnresolvedPatientReply(),
    };
  }

  if (initialTranscript) {
    const turn = await processTranscript({
      sessionId: id,
      transcript: initialTranscript,
      patientUserId: patient.user.id,
      phoneNumber,
    });
    return {
      sessionId: id,
      ...turn,
    };
  }

  return {
    sessionId: id,
    ...aiAssistantService.getInitialPrompt({ channel: 'voice' }),
  };
}

async function processTranscript({ sessionId, transcript, patientUserId, phoneNumber }) {
  const session = getSession(sessionId);
  const patient = await resolvePatient({
    patientUserId: patientUserId || session.patientUserId,
    phoneNumber: phoneNumber || session.phoneNumber,
  });

  if (!patient) {
    return buildUnresolvedPatientReply();
  }

  session.patientUserId = patient.user.id;
  if (phoneNumber) {
    session.phoneNumber = normalizePhone(phoneNumber) || session.phoneNumber;
  }

  const result = await aiAssistantService.processMessage(patient.user.id, transcript, {
    channel: 'voice',
    sessionKey: `voice:${sessionId}`,
  });

  return {
    ...result,
    speechText: result.reply,
    patientUserId: patient.user.id,
  };
}

function getSessionStatus(sessionId) {
  const session = getSession(sessionId);
  return {
    sessionId: session.id,
    patientUserId: session.patientUserId,
    phoneNumber: session.phoneNumber,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAt: session.expiresAt,
  };
}

function endSession(sessionId) {
  getSession(sessionId);
  VOICE_SESSIONS.delete(sessionId);
  aiAssistantService.resetSession(`voice:${sessionId}`);
  return { sessionId, ended: true };
}

export default {
  startSession,
  processTranscript,
  getSessionStatus,
  endSession,
};
