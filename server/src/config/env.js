import 'dotenv/config';

const parseOrigins = (raw) =>
  (raw || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: (process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite').trim(),
  geminiThinkingLevel: (process.env.GEMINI_THINKING_LEVEL || '').trim(),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'trade-documents',
  isVercel: Boolean(process.env.VERCEL),
};
