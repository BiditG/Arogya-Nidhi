import express from 'express';
import {
  endVoiceSession,
  getVoiceSessionStatus,
  handleVoiceTranscript,
  startVoiceSession,
} from '../controllers/voiceAssistant.controller.js';
import { authenticateServiceToken } from '../middlewares/serviceAuth.js';
import { validate } from '../middlewares/validate.js';
import {
  startVoiceSessionSchema,
  voiceSessionIdSchema,
  voiceTranscriptSchema,
} from '../validations/voiceAssistant.validation.js';

const router = express.Router();

router.use(authenticateServiceToken);

router.post('/session/start', validate(startVoiceSessionSchema), startVoiceSession);
router.post('/session/:sessionId/message', validate(voiceTranscriptSchema), handleVoiceTranscript);
router.get('/session/:sessionId', validate(voiceSessionIdSchema), getVoiceSessionStatus);
router.delete('/session/:sessionId', validate(voiceSessionIdSchema), endVoiceSession);

export default router;
