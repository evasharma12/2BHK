const cloudinary = require('cloudinary').v2;

function getConfig() {
  const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const api_key = (process.env.CLOUDINARY_API_KEY || '').trim();
  const api_secret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  return { cloud_name, api_key, api_secret };
}

function isConfigured() {
  const { cloud_name, api_key, api_secret } = getConfig();
  return !!(cloud_name && api_key && api_secret);
}

function ensureConfigured() {
  if (!isConfigured()) return;
  const { cloud_name, api_key, api_secret } = getConfig();
  cloudinary.config({ cloud_name, api_key, api_secret });
}

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} [folder='properties'] - Cloudinary folder name
 * @param {string} [originalName] - Original filename (for format)
 * @returns {Promise<string>} - secure_url of the uploaded image
 */
async function uploadStream(buffer, folder = 'properties', originalName = 'image') {
  ensureConfigured();
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
  }
  return new Promise((resolve, reject) => {
    const uploadOpts = {
      folder,
      resource_type: 'image',
    };
    cloudinary.uploader
      .upload_stream(uploadOpts, (err, result) => {
        if (err) return reject(err);
        if (!result || !result.secure_url) return reject(new Error('No URL returned from Cloudinary'));
        resolve(result.secure_url);
      })
      .end(buffer);
  });
}

module.exports = {
  cloudinary,
  isConfigured,
  uploadStream,
};
