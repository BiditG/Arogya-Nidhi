import twilioVoiceService from '../services/twilioVoice.service.js';

function resolveUserId(req) {
  return req.user?.userId || req.user?.sub || req.user?.id || null;
}

export const createBrowserVoiceToken = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User id not found in token' });
    }

    const result = twilioVoiceService.createBrowserVoiceAccessToken(userId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};

export const browserVoiceEvents = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User id not found in token' });
    }

    const result = twilioVoiceService.getBrowserVoiceEvents({
      sessionId: req.params.sessionId,
      userId,
      after: req.query.after,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};

export const endBrowserVoicePortalSession = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User id not found in token' });
    }

    const result = twilioVoiceService.endBrowserVoicePortalSession({
      sessionId: req.params.sessionId,
      userId,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};

export const twilioVoiceTwiML = async (req, res) => {
  try {
    const xml = twilioVoiceService.buildBrowserVoiceTwiML(req);
    res.type('text/xml');
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};

export const twilioVoiceStatus = async (req, res) => {
  try {
    twilioVoiceService.recordConversationRelayStatus(req.body);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};
