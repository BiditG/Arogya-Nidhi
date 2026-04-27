import { sendError } from '../util/response.util.js';

export const validate = (schema) => (req, res, next) => {
  if (!schema) {
    console.error('Validation Error: The schema provided to the validate middleware is undefined. Route:', req.originalUrl);
    return sendError(res, 'Internal Server Error Configuration', 500);
  }

  try {
    const result = schema.safeParse({
      body: req.body || {},
      query: req.query || {},
      params: req.params || {},
    });

    if (!result.success) {
      const messages = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      // Log validation details for easier debugging
      console.error('Validation failed for', req.originalUrl, '-', messages);
      return sendError(res, `Validation Error - ${messages}`, 400);
    }
    
    // Assign validated/transformed data back to req if necessary (optional)
    // req.body = result.data.body;
    
    next();
  } catch (error) {
    console.error('Unexpected error in validation middleware:', error);
    return sendError(res, 'Internal Server Error', 500);
  }
};
