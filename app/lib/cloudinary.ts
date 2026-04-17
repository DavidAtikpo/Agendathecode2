import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function ensureCloudinary() {
  const cfg = getCloudinaryConfig();
  if (!cfg) return null;
  if (!configured) {
    cloudinary.config(cfg);
    configured = true;
  }
  return cloudinary;
}
