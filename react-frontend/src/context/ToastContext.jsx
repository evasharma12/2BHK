import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import './ToastContext.css';

const SESSION_KEY = '2bhk_auth_toast';
const DEFAULT_DURATION_MS = 2500;

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, durationMs = DEFAULT_DURATION_MS) => {
    setToast({ message, id: Date.now(), durationMs });
  }, []);

  // Auto-dismiss in an effect so React Strict Mode’s simulated unmount does not
  // leave a visible toast with no timer (clearing only a ref-based timeout does).
  useEffect(() => {
    if (!toast) return undefined;
    const ms = toast.durationMs ?? DEFAULT_DURATION_MS;
    const timerId = window.setTimeout(() => {
      setToast(null);
    }, ms);
    return () => clearTimeout(timerId);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast &&
        createPortal(
          <div className="app-toast" role="status" aria-live="polite">
            {toast.message}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

/** Shows post-login / post-signup toast after full-page redirect from LoginPage. */
export function AuthToastOnLoad() {
  const { showToast } = useToast();

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    sessionStorage.removeItem(SESSION_KEY);
    const messages = {
      login: 'Successfully signed in',
      signup: 'Successfully signed up',
    };
    const msg = messages[raw] ?? messages.login;
    showToast(msg);
  }, [showToast]);

  return null;
}
