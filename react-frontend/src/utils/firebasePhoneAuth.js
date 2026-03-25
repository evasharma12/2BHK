import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

function validateFirebaseConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Missing Firebase config: ${missing.join(', ')}`);
  }
}

function getFirebaseAuth() {
  validateFirebaseConfig();
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}

export function getRecaptchaVerifier(containerId) {
  const auth = getFirebaseAuth();
  if (!window.__phoneRecaptchaByContainer) {
    window.__phoneRecaptchaByContainer = {};
  }

  const existing = window.__phoneRecaptchaByContainer[containerId];
  if (existing) {
    try {
      existing.clear();
    } catch (_) {}
    delete window.__phoneRecaptchaByContainer[containerId];
  }

  const containerEl = typeof document !== 'undefined' ? document.getElementById(containerId) : null;
  if (containerEl) {
    containerEl.innerHTML = '';
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
  window.__phoneRecaptchaByContainer[containerId] = verifier;
  return verifier;
}

export async function sendPhoneOtp(phoneE164, recaptchaVerifier) {
  const auth = getFirebaseAuth();
  return signInWithPhoneNumber(auth, phoneE164, recaptchaVerifier);
}
