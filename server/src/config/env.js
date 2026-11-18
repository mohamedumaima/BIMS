import 'dotenv/config';

const parseOrigins = (raw) =>
  (raw || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export function isPlaceholderDatabaseUrl(url) {
  if (!url || !String(url).trim()) return true;
  return /YOUR_LOCAL_PASSWORD|YOUR_SUPABASE_PASSWORD|\[YOUR-PASSWORD\]|\[YOUR-SUPABASE-PASSWORD\]|\[PROJECT-REF\]|\[REGION\]/i.test(
    String(url)
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  databaseUrl: (process.env.DATABASE_URL || '').trim(),
  directUrl: (process.env.DIRECT_URL || '').trim(),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: (process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite').trim(),
  geminiThinkingLevel: (process.env.GEMINI_THINKING_LEVEL || '').trim(),
  cloudinaryCloudName: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  cloudinaryApiKey: (process.env.CLOUDINARY_API_KEY || '').trim(),
  cloudinaryApiSecret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  cloudinaryProductFolder: (
    process.env.CLOUDINARY_PRODUCT_FOLDER || 'ceylon-spices/products'
  ).trim(),
  cloudinaryDocumentsFolder: (
    process.env.CLOUDINARY_DOCUMENTS_FOLDER || 'ceylon-spices/documents'
  ).trim(),
  supabaseUrl: (process.env.SUPABASE_URL || '').trim(),
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  supabaseStorageBucket: (
    process.env.SUPABASE_STORAGE_BUCKET || 'trade-documents'
  ).trim(),
  isVercel: Boolean(process.env.VERCEL),
};
