import { randomUUID } from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import twilio from 'twilio';
import aiAssistantService from './aiAssistant.service.js';

const PORTAL_SESSIONS = new Map();
const RELAY_PATH = process.env.TWILIO_CONVERSATION_WS_PATH || '/api/twilio/voice/relay';
const MAX_EVENTS_PER_SESSION = 100;

let relayServerAttached = false;

function nowIso() {
  return new Date().toISOString();
}

function makeSessionKey(sessionId) {
  return `twilio:${sessionId}`;
}

function toWsBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/^http/i, 'ws').replace(/\/$/, '');
}

function toHttpBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/^ws/i, 'http').replace(/\/$/, '');
}

function sanitizeIdentity(identity) {
  return String(identity || '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .slice(0, 121);
}

function splitReplyForSpeech(reply) {
  const chunks = String(reply || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.length ? chunks : [String(reply || '').trim()].filter(Boolean);
}

function normalizeSpeechReply(reply) {
  return String(reply || '')
    .replace(/\bDr\./g, 'Doctor')
    .replace(/\bRs\.?\s*/g, 'rupees ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDefaultAssistantGreeting() {
  return aiAssistantService.getInitialPrompt({ channel: 'voice' });
}

function createPortalSession(sessionId, seed = {}) {
  const session = {
    id: sessionId,
    userId: seed.userId || null,
    identity: seed.identity || null,
    status: seed.status || 'pending',
    callSid: seed.callSid || null,
    relaySessionId: seed.relaySessionId || null,
    events: [],
    nextEventId: 1,
    promptBuffer: [],
    lastUpdatedAt: nowIso(),
    createdAt: seed.createdAt || nowIso(),
  };

  PORTAL_SESSIONS.set(sessionId, session);
  return session;
}

function ensurePortalSession(sessionId, seed = {}) {
  const existing = PORTAL_SESSIONS.get(sessionId);
  if (!existing) {
    return createPortalSession(sessionId, seed);
  }

  Object.assign(existing, {
    userId: seed.userId || existing.userId,
    identity: seed.identity || existing.identity,
    status: seed.status || existing.status,
    callSid: seed.callSid || existing.callSid,
    relaySessionId: seed.relaySessionId || existing.relaySessionId,
    lastUpdatedAt: nowIso(),
  });

  return existing;
}

function getPortalSessionForUser(sessionId, userId) {
  const session = PORTAL_SESSIONS.get(sessionId);
  if (!session) {
    throw { status: 404, message: 'Twilio voice session not found' };
  }

  if (String(session.userId || '') !== String(userId || '')) {
    throw { status: 403, message: 'Forbidden' };
  }

  return session;
}

function getPortalSessionByRelayId(relaySessionId) {
  for (const session of PORTAL_SESSIONS.values()) {
    if (session.relaySessionId === relaySessionId) {
      return session;
    }
  }
  return null;
}

function recordEvent(session, event) {
  const entry = {
    id: session.nextEventId++,
    createdAt: nowIso(),
    ...event,
  };

  session.events.push(entry);
  if (session.events.length > MAX_EVENTS_PER_SESSION) {
    session.events.splice(0, session.events.length - MAX_EVENTS_PER_SESSION);
  }
  session.lastUpdatedAt = nowIso();
  return entry;
}

function sendTextToTwilio(socket, reply) {
  const spokenReply = normalizeSpeechReply(reply);
  const chunks = splitReplyForSpeech(spokenReply);

  chunks.forEach((chunk, index) => {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: 'text',
        token: chunk,
        last: index === chunks.length - 1,
        interruptible: true,
        preemptible: true,
      })
    );
  });
}

function extractUserIdFromIdentity(identity) {
  const normalized = sanitizeIdentity(identity);
  if (!normalized.startsWith('patient_')) return null;
  return normalized.slice('patient_'.length).replace(/_/g, '-');
}

function buildSignatureValidationUrl(request) {
  const publicBaseUrl = process.env.PUBLIC_BASE_URL || process.env.TWILIO_PUBLIC_BASE_URL || '';
  if (!publicBaseUrl) return null;
  return `${toWsBaseUrl(publicBaseUrl)}${request.url}`;
}

function validateTwilioUpgradeSignature(request) {
  if ((process.env.TWILIO_VALIDATE_SIGNATURES || 'false').toLowerCase() !== 'true') {
    return true;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const signature = request.headers['x-twilio-signature'];
  const expectedUrl = buildSignatureValidationUrl(request);

  if (!authToken || !signature || !expectedUrl) {
    return false;
  }

  try {
    return twilio.validateRequest(authToken, String(signature), expectedUrl, {});
  } catch {
    return false;
  }
}

async function handleSetupMessage(socket, payload) {
  const customParameters = payload.customParameters || {};
  const portalSessionId = customParameters.portalSessionId || randomUUID();
  const userId =
    customParameters.patientUserId ||
    customParameters.userId ||
    extractUserIdFromIdentity(customParameters.identity || payload.from);

  const session = ensurePortalSession(portalSessionId, {
    userId,
    identity: customParameters.identity || payload.from || null,
    status: 'connected',
    callSid: payload.callSid || null,
    relaySessionId: payload.sessionId || null,
  });

  socket.portalSessionId = portalSessionId;

  const greeting = buildDefaultAssistantGreeting();
  recordEvent(session, {
    role: 'assistant',
    text: greeting.reply,
    stage: greeting.stage || 'specialty',
    actions: greeting.actions || [],
    bookingPreview: greeting.bookingPreview || null,
    booking: greeting.booking || null,
  });

  sendTextToTwilio(socket, greeting.reply);
}

async function handlePromptMessage(socket, payload) {
  const portalSessionId = socket.portalSessionId;
  if (!portalSessionId) return;

  const session = PORTAL_SESSIONS.get(portalSessionId);
  if (!session?.userId) {
    sendTextToTwilio(
      socket,
      'I could not identify your account for this call yet. Please reopen the call from the patient portal and try again.'
    );
    return;
  }

  const promptText = String(payload.voicePrompt || '').trim();
  if (promptText) {
    session.promptBuffer.push(promptText);
  }

  if (!payload.last) {
    return;
  }

  const transcript = session.promptBuffer.join(' ').replace(/\s+/g, ' ').trim();
  session.promptBuffer = [];

  if (!transcript) {
    return;
  }

  recordEvent(session, {
    role: 'user',
    text: transcript,
  });

  const result = await aiAssistantService.processMessage(session.userId, transcript, {
    channel: 'voice',
    sessionKey: makeSessionKey(portalSessionId),
  });

  recordEvent(session, {
    role: 'assistant',
    text: result.reply,
    stage: result.stage || 'specialty',
    actions: result.actions || [],
    bookingPreview: result.bookingPreview || null,
    booking: result.booking || null,
  });

  sendTextToTwilio(socket, result.reply);
}

function handleInterruptMessage(socket, payload) {
  const portalSessionId = socket.portalSessionId;
  if (!portalSessionId) return;
  const session = PORTAL_SESSIONS.get(portalSessionId);
  if (!session) return;

  recordEvent(session, {
    role: 'system',
    text: payload.utteranceUntilInterrupt
      ? `Caller interrupted assistant playback after hearing: ${payload.utteranceUntilInterrupt}`
      : 'Caller interrupted assistant playback.',
  });
}

function handleErrorMessage(socket, payload) {
  const portalSessionId = socket.portalSessionId;
  if (!portalSessionId) return;
  const session = PORTAL_SESSIONS.get(portalSessionId);
  if (!session) return;

  session.status = 'failed';
  recordEvent(session, {
    role: 'system',
    text: payload.description || 'ConversationRelay reported an error.',
  });
}

export function buildTwilioClientIdentity(userId) {
  return sanitizeIdentity(`patient_${String(userId || '').replace(/-/g, '_')}`);
}

export function registerPendingPortalSession({ sessionId, userId, identity }) {
  ensurePortalSession(sessionId, {
    userId,
    identity,
    status: 'pending',
  });
}

export function listPortalSessionEvents({ sessionId, userId, after = 0 }) {
  const session = getPortalSessionForUser(sessionId, userId);
  const cursor = Number(after || 0);
  const events = session.events.filter((event) => event.id > cursor);
  const nextCursor = session.events.length ? session.events[session.events.length - 1].id : cursor;

  return {
    sessionId,
    status: session.status,
    relaySessionId: session.relaySessionId,
    callSid: session.callSid,
    events,
    nextCursor,
  };
}

export function closePortalSession({ sessionId, userId }) {
  const session = PORTAL_SESSIONS.get(sessionId);
  if (!session) {
    return { sessionId, ended: true };
  }
  if (String(session.userId || '') !== String(userId || '')) {
    throw { status: 403, message: 'Forbidden' };
  }
  aiAssistantService.resetSession(makeSessionKey(sessionId));
  PORTAL_SESSIONS.delete(sessionId);
  return { sessionId, ended: true };
}

export function handleConversationRelayStatusCallback(body = {}) {
  const relaySessionId = body.SessionId || body.sessionId || null;
  const session = relaySessionId ? getPortalSessionByRelayId(relaySessionId) : null;
  if (!session) {
    return { ok: true };
  }

  session.status = body.SessionStatus || body.CallStatus || session.status;
  session.lastUpdatedAt = nowIso();

  if (body.ErrorMessage) {
    recordEvent(session, {
      role: 'system',
      text: `Twilio reported: ${body.ErrorMessage}`,
    });
  }

  if (body.SessionStatus === 'completed' || body.SessionStatus === 'failed') {
    aiAssistantService.resetSession(makeSessionKey(session.id));
  }

  return { ok: true };
}

export function attachTwilioConversationRelayServer(server) {
  if (relayServerAttached) {
    return;
  }

  relayServerAttached = true;

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname !== RELAY_PATH) {
      return;
    }

    if (!validateTwilioUpgradeSignature(request)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (socket) => {
    socket.on('message', async (raw) => {
      try {
        const payload = JSON.parse(String(raw || '{}'));

        if (payload.type === 'setup') {
          await handleSetupMessage(socket, payload);
          return;
        }

        if (payload.type === 'prompt') {
          await handlePromptMessage(socket, payload);
          return;
        }

        if (payload.type === 'interrupt') {
          handleInterruptMessage(socket, payload);
          return;
        }

        if (payload.type === 'error') {
          handleErrorMessage(socket, payload);
        }
      } catch (error) {
        console.error('ConversationRelay socket error', error);
      }
    });

    socket.on('close', () => {
      const portalSessionId = socket.portalSessionId;
      if (!portalSessionId) return;
      const session = PORTAL_SESSIONS.get(portalSessionId);
      if (!session) return;
      session.status = session.status === 'failed' ? session.status : 'disconnected';
      session.lastUpdatedAt = nowIso();
    });
  });
}

export function getTwilioConversationRelayPath() {
  return RELAY_PATH;
}

export function getTwilioConversationRelayHttpBase(req) {
  const configured = process.env.PUBLIC_BASE_URL || process.env.TWILIO_PUBLIC_BASE_URL;
  if (configured) {
    return toHttpBaseUrl(configured);
  }

  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${protocol}://${host}`;
}
