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

/** One RecaptchaVerifier per container; reusing it avoids "already rendered in this element". */
const recaptchaByContainerId = new Map();

/**
 * Returns an existing invisible reCAPTCHA for this container, or creates it once.
 * Do not call `new RecaptchaVerifier` again for the same DOM node.
 */
export function getOrCreateRecaptchaVerifier(containerId) {
  const auth = getFirebaseAuth();
  const existing = recaptchaByContainerId.get(containerId);
  if (existing) {
    return existing;
  }

  const containerEl =
    typeof document !== 'undefined' ? document.getElementById(containerId) : null;
  if (!containerEl) {
    throw new Error('reCAPTCHA container is not in the document yet');
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
  recaptchaByContainerId.set(containerId, verifier);
  return verifier;
}

/**
 * Removes the widget and listeners; call on unmount or before replacing the container.
 */
export function clearRecaptchaVerifier(containerId) {
  const verifier = recaptchaByContainerId.get(containerId);
  if (verifier) {
    try {
      verifier.clear();
    } catch (_) {
      /* ignore */
    }
    recaptchaByContainerId.delete(containerId);
  }

  if (typeof document === 'undefined') return;
  const el = document.getElementById(containerId);
  if (el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }
}

export async function sendPhoneOtp(phoneE164, recaptchaVerifier) {
  const auth = getFirebaseAuth();
  return signInWithPhoneNumber(auth, phoneE164, recaptchaVerifier);
}
