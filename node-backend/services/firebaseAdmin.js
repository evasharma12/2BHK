const admin = require('firebase-admin');

let initialized = false;

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch (err) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
    return null;
  }
}

function initFirebaseAdmin() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const serviceAccount = getServiceAccountFromEnv();
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    return;
  }

  if (projectId) {
    // Fallback: app initialized with explicit project id. Useful when
    // GOOGLE_APPLICATION_CREDENTIALS is configured in runtime.
    admin.initializeApp({ projectId });
    initialized = true;
    return;
  }
}

async function verifyFirebaseIdToken(idToken) {
  initFirebaseAdmin();
  if (!initialized) {
    throw new Error('Firebase Admin is not configured on backend');
  }
  return admin.auth().verifyIdToken(idToken);
}

module.exports = {
  verifyFirebaseIdToken,
};
