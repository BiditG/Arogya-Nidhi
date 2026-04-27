import { randomUUID } from 'crypto';
import twilio from 'twilio';
import {
  buildTwilioClientIdentity,
  getTwilioConversationRelayHttpBase,
  getTwilioConversationRelayPath,
  handleConversationRelayStatusCallback,
  listPortalSessionEvents,
  registerPendingPortalSession,
  closePortalSession,
} from './twilioConversationRelay.service.js';

const { jwt: { AccessToken }, twiml: { VoiceResponse } } = twilio;
const { VoiceGrant } = AccessToken;

function requireEnv(name, label = name) {
  const value = process.env[name];
  if (!value) {
    throw {
      status: 503,
      message: `${label} is not configured. Add it to backend/.env before using Twilio voice.`,
    };
  }
  return value;
}

function toWsUrl(httpBaseUrl) {
  return String(httpBaseUrl || '').replace(/^http/i, 'ws').replace(/\/$/, '');
}

function buildConversationHints() {
  const hints = [
    'Arogya Nidhi',
    'अरोग्य निधि',
    'Cardiology',
    'Neurology',
    'Dermatology',
    'Orthopedics',
    'Pediatrics',
    'General Physician',
    'appointment booking',
    'doctor availability',
    'अपोइन्टमेन्ट',
    'डाक्टर',
    'हृदय रोग',
    'न्युरोलोजी',
    'छाला रोग',
    'हड्डी रोग',
    'बाल रोग',
    'सामान्य चिकित्सक',
    'बुकिङ',
    'उपलब्धता',
  ];

  return hints.join(', ');
}

function buildConversationRelayOptions(req) {
  const httpBaseUrl = getTwilioConversationRelayHttpBase(req);
  const websocketUrl = `${toWsUrl(httpBaseUrl)}${getTwilioConversationRelayPath()}`;

  const options = {
    url: websocketUrl,
    welcomeGreetingInterruptible: 'speech',
    hints: buildConversationHints(),
  };

  const language = process.env.TWILIO_CONVERSATION_LANGUAGE || '';
  const ttsProvider = process.env.TWILIO_TTS_PROVIDER || '';
  const ttsVoice = process.env.TWILIO_TTS_VOICE || '';
  const transcriptionLanguage = process.env.TWILIO_TRANSCRIPTION_LANGUAGE || '';
  const transcriptionProvider = process.env.TWILIO_TRANSCRIPTION_PROVIDER || '';
  const speechModel = process.env.TWILIO_SPEECH_MODEL || '';

  if (language) options.language = language;
  if (ttsProvider) options.ttsProvider = ttsProvider;
  if (ttsVoice) options.voice = ttsVoice;
  if (transcriptionLanguage) options.transcriptionLanguage = transcriptionLanguage;
  if (transcriptionProvider) options.transcriptionProvider = transcriptionProvider;
  if (speechModel) options.speechModel = speechModel;

  return options;
}

export function createBrowserVoiceAccessToken(userId) {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID', 'TWILIO_ACCOUNT_SID');
  const apiKeySid = requireEnv('TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SID');
  const apiKeySecret = requireEnv('TWILIO_API_KEY_SECRET', 'TWILIO_API_KEY_SECRET');
  const twimlAppSid = requireEnv('TWILIO_TWIML_APP_SID', 'TWILIO_TWIML_APP_SID');

  const identity = buildTwilioClientIdentity(userId);
  const sessionId = randomUUID();

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity,
    ttl: 60 * 60,
  });

  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: false,
    })
  );

  registerPendingPortalSession({ sessionId, userId, identity });

  return {
    accessToken: token.toJwt(),
    identity,
    sessionId,
    params: {
      portalSessionId: sessionId,
      patientUserId: String(userId),
    },
  };
}

export function buildBrowserVoiceTwiML(req) {
  requireEnv('TWILIO_ACCOUNT_SID', 'TWILIO_ACCOUNT_SID');
  requireEnv('TWILIO_AUTH_TOKEN', 'TWILIO_AUTH_TOKEN');

  const response = new VoiceResponse();
  const actionUrl = `${getTwilioConversationRelayHttpBase(req)}/api/twilio/voice/status`;
  const connect = response.connect({
    action: actionUrl,
    method: 'POST',
  });

  const conversationRelay = connect.conversationRelay(buildConversationRelayOptions(req));
  const portalSessionId = String(req.body?.portalSessionId || '').trim();
  const patientUserId = String(req.body?.patientUserId || '').trim();
  const identity = String(req.body?.From || '').replace(/^client:/i, '').trim();

  if (portalSessionId) {
    conversationRelay.parameter({ name: 'portalSessionId', value: portalSessionId });
  }
  if (patientUserId) {
    conversationRelay.parameter({ name: 'patientUserId', value: patientUserId });
  }
  if (identity) {
    conversationRelay.parameter({ name: 'identity', value: identity });
  }

  return response.toString();
}

export function recordConversationRelayStatus(body) {
  return handleConversationRelayStatusCallback(body);
}

export function getBrowserVoiceEvents({ sessionId, userId, after }) {
  return listPortalSessionEvents({ sessionId, userId, after });
}

export function endBrowserVoicePortalSession({ sessionId, userId }) {
  return closePortalSession({ sessionId, userId });
}

export default {
  createBrowserVoiceAccessToken,
  buildBrowserVoiceTwiML,
  recordConversationRelayStatus,
  getBrowserVoiceEvents,
  endBrowserVoicePortalSession,
};
