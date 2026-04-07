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
    console.error('[PhoneOTP] Missing Firebase config keys', { missing });
    throw new Error(`Missing Firebase config: ${missing.join(', ')}`);
  }
}

function getFirebaseAuth() {
  validateFirebaseConfig();
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // Match Firebase docs recommendation to localize auth flows/SMS where possible.
  if (typeof auth.useDeviceLanguage === 'function') {
    auth.useDeviceLanguage();
  }
  return auth;
}

/** One RecaptchaVerifier per container; reusing it avoids "already rendered in this element". */
const recaptchaByContainerId = new Map();

/**
 * Returns an existing invisible reCAPTCHA for this container, or creates it once.
 * Do not call `new RecaptchaVerifier` again for the same DOM node.
 */
export function getOrCreateRecaptchaVerifier(containerId) {
  console.info('[PhoneOTP] getOrCreateRecaptchaVerifier called', { containerId });
  const auth = getFirebaseAuth();
  const existing = recaptchaByContainerId.get(containerId);
  if (existing) {
    console.info('[PhoneOTP] Reusing existing reCAPTCHA verifier', { containerId });
    return existing;
  }

  const containerEl =
    typeof document !== 'undefined' ? document.getElementById(containerId) : null;
  if (!containerEl) {
    console.error('[PhoneOTP] reCAPTCHA container not found', { containerId });
    throw new Error('reCAPTCHA container is not in the document yet');
  }

  console.info('[PhoneOTP] Creating new reCAPTCHA verifier', { containerId });
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.info('[PhoneOTP] reCAPTCHA solved', { containerId });
    },
    'expired-callback': () => {
      console.warn('[PhoneOTP] reCAPTCHA expired; clearing verifier', { containerId });
      clearRecaptchaVerifier(containerId);
    },
  });
  recaptchaByContainerId.set(containerId, verifier);
  return verifier;
}

/**
 * Removes the widget and listeners; call on unmount or before replacing the container.
 */
export function clearRecaptchaVerifier(containerId) {
  console.info('[PhoneOTP] Clearing reCAPTCHA verifier', { containerId });
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
  console.info('[PhoneOTP] sendPhoneOtp called', {
    phoneE164,
    hasRecaptchaVerifier: !!recaptchaVerifier,
  });
  const auth = getFirebaseAuth();
  try {
    if (recaptchaVerifier && typeof recaptchaVerifier.render === 'function') {
      await recaptchaVerifier.render();
      console.info('[PhoneOTP] reCAPTCHA rendered before signInWithPhoneNumber');
    }
    const result = await signInWithPhoneNumber(auth, phoneE164, recaptchaVerifier);
    console.info('[PhoneOTP] signInWithPhoneNumber succeeded', { phoneE164 });
    return result;
  } catch (err) {
    try {
      if (recaptchaVerifier && typeof recaptchaVerifier.render === 'function') {
        const widgetId = await recaptchaVerifier.render();
        if (typeof window !== 'undefined' && window.grecaptcha?.reset) {
          window.grecaptcha.reset(widgetId);
          console.info('[PhoneOTP] reCAPTCHA reset after send failure', { widgetId });
        } else {
          console.warn('[PhoneOTP] grecaptcha.reset unavailable; clearing verifier for fresh retry');
          recaptchaByContainerId.forEach((value, key) => {
            if (value === recaptchaVerifier) clearRecaptchaVerifier(key);
          });
        }
      }
    } catch (resetErr) {
      console.warn('[PhoneOTP] Failed to reset reCAPTCHA after send failure', {
        message: resetErr?.message || 'Unknown error',
      });
    }
    console.error('[PhoneOTP] signInWithPhoneNumber failed', {
      phoneE164,
      message: err?.message || 'Unknown error',
      code: err?.code || null,
      name: err?.name || null,
    });
    throw err;
  }
}
