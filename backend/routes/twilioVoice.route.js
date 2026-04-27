import express from 'express';
import {
  browserVoiceEvents,
  createBrowserVoiceToken,
  endBrowserVoicePortalSession,
  twilioVoiceStatus,
  twilioVoiceTwiML,
} from '../controllers/twilioVoice.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  twilioBrowserSessionEventsSchema,
  twilioVoiceSessionIdSchema,
} from '../validations/ai.validation.js';

const router = express.Router();

router.post('/token', authenticate, requireRole('patient'), createBrowserVoiceToken);
router.get(
  '/session/:sessionId/events',
  authenticate,
  requireRole('patient'),
  validate(twilioBrowserSessionEventsSchema),
  browserVoiceEvents
);
router.delete(
  '/session/:sessionId',
  authenticate,
  requireRole('patient'),
  validate(twilioVoiceSessionIdSchema),
  endBrowserVoicePortalSession
);

router.all('/twiml', twilioVoiceTwiML);
router.post('/status', twilioVoiceStatus);

export default router;
