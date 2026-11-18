import path from 'node:path';
import { getCloudinaryClient } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';

function sanitizeFileName(name = 'bims-upload') {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

function inferFormatFromFile(file, resultFormat) {
  if (resultFormat) return resultFormat;
  const ext = path.extname(file?.originalname || '').replace('.', '').toLowerCase();
  if (ext) return ext;
  if (file?.mimetype === 'application/pdf') return 'pdf';
  if (file?.mimetype === 'image/png') return 'png';
  if (file?.mimetype === 'image/webp') return 'webp';
  return 'jpg';
}

function isImageOrPdfMime(mimetype = '') {
  return mimetype.startsWith('image/') || mimetype === 'application/pdf';
}

function uploadBufferToCloudinary(cloudinary, file, options = {}) {
  return new Promise((resolve, reject) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = path
      .basename(file.originalname || 'asset', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 48);
    const resourceType = options.resourceType || (isImageOrPdfMime(file.mimetype) ? 'auto' : 'raw');
    const publicId =
      resourceType === 'raw' && ext
        ? `${Date.now()}-${baseName || 'file'}${ext}`
        : `${Date.now()}-${baseName || 'file'}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || env.cloudinaryProductFolder,
        public_id: publicId,
        resource_type: resourceType,
        type: options.deliveryType || 'upload',
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

/**
 * Stores a public spice SKU image in Cloudinary first (if configured),
 * falling back to Supabase Storage or an inline base64 data URI.
 */
export async function storeUploadedProductImage(file) {
  if (!file || !file.buffer) {
    return null;
  }

  const cloudinary = getCloudinaryClient();
  if (cloudinary) {
    const result = await uploadBufferToCloudinary(cloudinary, file, {
      folder: env.cloudinaryProductFolder,
      resourceType: 'image',
      deliveryType: 'upload',
    });
    if (result?.secure_url) {
      return result.secure_url;
    }
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const objectPath = `products/${Date.now()}-${sanitizeFileName(file.originalname)}`;
    const { error } = await supabase.storage
      .from(env.supabaseStorageBucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (!error) {
      const { data } = supabase.storage
        .from(env.supabaseStorageBucket)
        .getPublicUrl(objectPath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  }

  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

/**
 * Stores financial, trade, or management documents (images, PDFs, spreadsheets, etc.).
 * Uses Cloudinary authenticated delivery when configured so files require RBAC-signed access.
 */
export async function storeProtectedDocumentFile(file, { privateAccess = true } = {}) {
  if (!file || !file.buffer) {
    return null;
  }

  const cloudinary = getCloudinaryClient();
  if (cloudinary) {
    const deliveryType = privateAccess ? 'authenticated' : 'upload';
    const targetResourceType = isImageOrPdfMime(file.mimetype) ? 'auto' : 'raw';
    const result = await uploadBufferToCloudinary(cloudinary, file, {
      folder: env.cloudinaryDocumentsFolder,
      resourceType: targetResourceType,
      deliveryType,
    });

    const isRaw = (result.resource_type || targetResourceType) === 'raw';
    return {
      storageProvider: 'CLOUDINARY',
      filePath: result.secure_url,
      storageKey: result.public_id,
      resourceType: result.resource_type || 'image',
      deliveryType: result.type || deliveryType,
      fileFormat: isRaw ? '' : inferFormatFromFile(file, result.format),
      mimeType: file.mimetype,
      fileSizeBytes: Number(result.bytes || file.size || 0),
    };
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const objectPath = `documents/${Date.now()}-${sanitizeFileName(file.originalname)}`;
    const { error } = await supabase.storage
      .from(env.supabaseStorageBucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (!error) {
      return {
        storageProvider: 'SUPABASE',
        filePath: objectPath,
        storageKey: objectPath,
        resourceType: 'raw',
        deliveryType: privateAccess ? 'authenticated' : 'upload',
        fileFormat: inferFormatFromFile(file),
        mimeType: file.mimetype,
        fileSizeBytes: Number(file.size || file.buffer.length || 0),
      };
    }
  }

  return {
    storageProvider: 'INLINE',
    filePath: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
    storageKey: null,
    resourceType: 'raw',
    deliveryType: 'inline',
    fileFormat: inferFormatFromFile(file),
    mimeType: file.mimetype,
    fileSizeBytes: Number(file.size || file.buffer.length || 0),
  };
}

/**
 * Generates a short-lived signed access URL for viewing or downloading a protected document.
 */
export async function resolveDocumentAccessUrl(doc, { expiresInSeconds = 300, download = false } = {}) {
  if (!doc) return null;

  if (doc.storageProvider === 'CLOUDINARY' && doc.storageKey) {
    const cloudinary = getCloudinaryClient();
    if (cloudinary) {
      if (doc.deliveryType === 'authenticated' || doc.deliveryType === 'private') {
        const formatArg =
          doc.resourceType === 'raw'
            ? doc.fileFormat || ''
            : doc.fileFormat ||
              inferFormatFromFile({
                originalname: doc.fileName,
                mimetype: doc.mimeType,
              });
        return cloudinary.utils.private_download_url(doc.storageKey, formatArg, {
          resource_type: doc.resourceType || 'image',
          type: doc.deliveryType,
          expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
          attachment: Boolean(download),
        });
      }
      return doc.filePath;
    }
  }

  if (doc.storageProvider === 'SUPABASE' && doc.storageKey) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase.storage
        .from(env.supabaseStorageBucket)
        .createSignedUrl(doc.storageKey, expiresInSeconds, {
          download: Boolean(download),
        });
      if (data?.signedUrl) {
        return data.signedUrl;
      }
    }
  }

  return doc.filePath || null;
}

/**
 * Deletes an uploaded document binary from Cloudinary or Supabase Storage when present.
 */
export async function deleteStoredDocumentAsset(doc) {
  if (!doc || !doc.storageKey) return;

  if (doc.storageProvider === 'CLOUDINARY') {
    const cloudinary = getCloudinaryClient();
    if (cloudinary) {
      await cloudinary.uploader
        .destroy(doc.storageKey, {
          resource_type: doc.resourceType || 'image',
          type: doc.deliveryType || 'authenticated',
          invalidate: true,
        })
        .catch(() => {});
    }
    return;
  }

  if (doc.storageProvider === 'SUPABASE') {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.storage
        .from(env.supabaseStorageBucket)
        .remove([doc.storageKey])
        .catch(() => {});
    }
  }
}
