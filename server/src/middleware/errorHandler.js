import { ZodError } from 'zod';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Uploaded file exceeds the 4 MB serverless limit',
    });
  }

  if (err?.code === 'P2002') {
    return res.status(409).json({
      error: 'A record with that unique value already exists',
    });
  }

  if (err?.code === 'P2025') {
    return res.status(404).json({
      error: 'Requested record was not found',
    });
  }

  const statusCode = err?.statusCode || 500;
  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err?.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error('[API Error]', err);
  }

  return res.status(statusCode).json({ error: message });
}
