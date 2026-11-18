import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

let configuredSignature = '';

/**
 * Returns true when all three required Cloudinary credentials are present.
 */
export function isCloudinaryConfigured() {
  if (env.nodeEnv === 'test' && process.env.RUN_LIVE_CLOUD_TESTS !== 'true') {
    return false;
  }
  return Boolean(
    env.cloudinaryCloudName &&
      env.cloudinaryApiKey &&
      env.cloudinaryApiSecret
  );
}

/**
 * Lazily configures and returns Cloudinary v2 SDK instance, or null when unconfigured.
 */
export function getCloudinaryClient() {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  const nextSignature = `${env.cloudinaryCloudName}:${env.cloudinaryApiKey}:${env.cloudinaryApiSecret}`;
  if (configuredSignature !== nextSignature) {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true,
    });
    configuredSignature = nextSignature;
  }

  return cloudinary;
}
