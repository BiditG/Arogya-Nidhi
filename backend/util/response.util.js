export function sendSuccess(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(res, message = 'Internal Server Error', statusCode = 500) {
  // If an Error object is passed, log stack for debugging
  if (message instanceof Error) {
    console.error('sendError:', message.stack || message.message || message);
    message = message.message || 'Internal Server Error';
  }
  // Otherwise, log the message string (useful for server-side debugging)
  else if (typeof message === 'string' && statusCode >= 500) {
    console.error('sendError:', message);
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
}
