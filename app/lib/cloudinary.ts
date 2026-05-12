import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  /* Le SDK Cloudinary v2 attend des clés en snake_case. */
  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  };
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
