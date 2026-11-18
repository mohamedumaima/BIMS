import multer from 'multer';

// Use memoryStorage so uploads work cleanly on Vercel's read-only serverless filesystem
// and stay below Vercel's 4.5 MB request body limit.
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

const ALL_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function createMemoryUploader(allowedTypes, errorMessage) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
    fileFilter: (_req, file, cb) => {
      if (!allowedTypes.has(file.mimetype)) {
        const error = new Error(errorMessage);
        error.statusCode = 400;
        return cb(error);
      }
      return cb(null, true);
    },
  });
}

export const uploadMemory = createMemoryUploader(
  ALL_ALLOWED_MIME_TYPES,
  'Unsupported file type. Allowed: PNG, JPG, WebP, GIF, PDF, CSV, TXT, DOC/DOCX, XLS/XLSX.'
);

export const uploadProductImage = createMemoryUploader(
  IMAGE_MIME_TYPES,
  'Unsupported image format. Please choose a JPEG, PNG, or WebP image.'
);
