import { env } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';

function sanitizeFileName(name = 'spice-image') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

/**
 * Stores an uploaded product image in Supabase Storage when configured,
 * falling back to an embedded base64 data URI for local / zero-config runs.
 */
export async function storeUploadedProductImage(file) {
  if (!file || !file.buffer) {
    return null;
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
