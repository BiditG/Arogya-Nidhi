import { sendError } from '../util/response.util.js';

export function authenticateServiceToken(req, res, next) {
  const expectedToken = process.env.AI_SERVICE_TOKEN;
  if (!expectedToken) {
    return sendError(res, 'AI service token is not configured', 500);
  }

  const headerToken = req.headers['x-service-token'];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const suppliedToken = headerToken || bearerToken || null;

  if (!suppliedToken || suppliedToken !== expectedToken) {
    return sendError(res, 'Invalid or missing service token', 401);
  }

  req.service = {
    name: req.headers['x-service-name'] || 'ai-voice-agent',
    authenticated: true,
  };

  return next();
}
