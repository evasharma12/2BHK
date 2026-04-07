import React, { useEffect, useId, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import {
  clearRecaptchaVerifier,
  getOrCreateRecaptchaVerifier,
  sendPhoneOtp,
} from '../../utils/firebasePhoneAuth';
import './PhoneOtpVerifier.css';

const RESEND_COOLDOWN_SECONDS = 30;

function toOtpDebugError(err) {
  return {
    message: err?.message || 'Unknown error',
    code: err?.code || null,
    name: err?.name || null,
  };
}

function getFriendlyOtpErrorMessage(err) {
  const code = String(err?.code || '');
  if (code.includes('too-many-requests') || code.includes('quota-exceeded')) {
    return 'OTP requests are temporarily limited. Please wait and try again later.';
  }
  if (code.includes('invalid-phone-number')) {
    return 'Please enter a valid phone number in the correct format.';
  }
  if (code.includes('captcha-check-failed')) {
    return 'Security check failed. Please try sending OTP again.';
  }
  return err?.message || 'Failed to send OTP';
}

const PhoneOtpVerifier = ({ userId, phoneNumber, onVerifiedChange }) => {
  const [status, setStatus] = useState('idle'); // idle|checking|sending|sent|verifying|verified|error
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const recaptchaId = useId().replace(/:/g, '_');
  const recaptchaContainerId = `recaptcha_phone_otp_${recaptchaId}`;

  const normalizedPhone = useMemo(() => String(phoneNumber || '').replace(/\D/g, ''), [phoneNumber]);
  const isPhoneValid = normalizedPhone.length === 10;
  const phoneE164 = isPhoneValid ? `+91${normalizedPhone}` : '';

  useEffect(() => {
    setOtp('');
    setConfirmationResult(null);
    setResendCooldown(0);
    if (!userId || !isPhoneValid) {
      setStatus('idle');
      setMessage('');
      onVerifiedChange?.(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus('checking');
      setMessage('');
      try {
        const data = await api.getPhoneVerificationStatus(userId, normalizedPhone);
        if (cancelled) return;
        if (data.is_verified && !data.needs_verification) {
          setStatus('verified');
          setMessage('Mobile number verified');
          onVerifiedChange?.(true);
        } else {
          setStatus('idle');
          onVerifiedChange?.(false);
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.message || 'Failed to check phone verification');
        onVerifiedChange?.(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, normalizedPhone, isPhoneValid, onVerifiedChange]);

  useEffect(() => {
    return () => {
      clearRecaptchaVerifier(recaptchaContainerId);
    };
  }, [recaptchaContainerId]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    console.info('[PhoneOTP] Send OTP triggered', {
      userId,
      isPhoneValid,
      normalizedPhoneLength: normalizedPhone.length,
      hasSentOtp: confirmationResult !== null,
      resendCooldown,
      status,
    });
    if (!isPhoneValid) {
      console.warn('[PhoneOTP] Send OTP blocked: invalid phone', {
        userId,
        normalizedPhone,
      });
      setStatus('error');
      setMessage('Enter a valid 10-digit mobile number first');
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      console.info('[PhoneOTP] Creating/reusing reCAPTCHA verifier', {
        recaptchaContainerId,
        phoneE164,
      });
      const verifier = getOrCreateRecaptchaVerifier(recaptchaContainerId);
      console.info('[PhoneOTP] Calling Firebase signInWithPhoneNumber', { phoneE164 });
      const result = await sendPhoneOtp(phoneE164, verifier);
      console.info('[PhoneOTP] Firebase send OTP success', {
        hasConfirmationResult: !!result,
      });
      setConfirmationResult(result);
      setStatus('sent');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage(`OTP sent to ${phoneE164}`);
    } catch (err) {
      console.error('[PhoneOTP] Send OTP failed', toOtpDebugError(err));
      clearRecaptchaVerifier(recaptchaContainerId);
      setStatus('error');
      setMessage(getFriendlyOtpErrorMessage(err));
    }
  };

  const handleVerifyOtp = async () => {
    console.info('[PhoneOTP] Verify OTP triggered', {
      userId,
      otpLength: otp.length,
      hasConfirmationResult: !!confirmationResult,
    });
    if (!confirmationResult) {
      console.warn('[PhoneOTP] Verify blocked: OTP not requested yet', { userId });
      setStatus('error');
      setMessage('Please request OTP first');
      return;
    }
    if (!otp || otp.length < 6) {
      console.warn('[PhoneOTP] Verify blocked: OTP length invalid', { otpLength: otp.length });
      setStatus('error');
      setMessage('Please enter the 6-digit OTP');
      return;
    }
    setStatus('verifying');
    setMessage('');
    try {
      console.info('[PhoneOTP] Confirming OTP with Firebase');
      const cred = await confirmationResult.confirm(otp);
      console.info('[PhoneOTP] Firebase OTP confirm success');
      const idToken = await cred.user.getIdToken();
      console.info('[PhoneOTP] Calling backend verifyPhoneOtp');
      await api.verifyPhoneOtp(userId, normalizedPhone, idToken);
      console.info('[PhoneOTP] Backend verifyPhoneOtp success');
      setStatus('verified');
      setMessage('Phone verified successfully');
      onVerifiedChange?.(true);
      setOtp('');
    } catch (err) {
      console.error('[PhoneOTP] Verify OTP failed', toOtpDebugError(err));
      setStatus('error');
      setMessage(err.message || 'Invalid OTP. Please try again.');
      onVerifiedChange?.(false);
    }
  };

  const hasSentOtp = confirmationResult !== null;
  const canResendOtp = hasSentOtp && resendCooldown === 0;
  const sendButtonLabel = status === 'sending'
    ? 'Sending OTP...'
    : hasSentOtp
      ? 'Resend OTP'
      : 'Send OTP';
  const shouldShowOtpInput = hasSentOtp || status === 'verifying';

  return (
    <div className="phone-otp-verifier">
      <div id={recaptchaContainerId} />
      {status === 'verified' ? (
        <div className="phone-otp-success">Verified</div>
      ) : (
        <div className="phone-otp-actions">
          <button
            type="button"
            className="phone-otp-btn"
            onClick={handleSendOtp}
            disabled={
              !isPhoneValid ||
              status === 'sending' ||
              status === 'verifying' ||
              status === 'checking' ||
              (hasSentOtp && !canResendOtp)
            }
          >
            {sendButtonLabel}
          </button>
          {hasSentOtp && resendCooldown > 0 ? (
            <span className="phone-otp-timer">Resend in {resendCooldown}s</span>
          ) : null}
          {shouldShowOtpInput ? (
            <>
              <input
                type="text"
                className="phone-otp-input"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button
                type="button"
                className="phone-otp-btn phone-otp-btn--verify"
                onClick={handleVerifyOtp}
                disabled={status === 'verifying'}
              >
                {status === 'verifying' ? 'Verifying...' : 'Verify OTP'}
              </button>
            </>
          ) : null}
        </div>
      )}
      {message ? (
        <div className={status === 'error' ? 'phone-otp-message phone-otp-message--error' : 'phone-otp-message'}>
          {message}
        </div>
      ) : null}
    </div>
  );
};

export default PhoneOtpVerifier;
