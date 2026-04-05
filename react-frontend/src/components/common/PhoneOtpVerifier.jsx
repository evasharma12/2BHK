import React, { useEffect, useId, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import {
  clearRecaptchaVerifier,
  getOrCreateRecaptchaVerifier,
  sendPhoneOtp,
} from '../../utils/firebasePhoneAuth';
import './PhoneOtpVerifier.css';

const PhoneOtpVerifier = ({ userId, phoneNumber, onVerifiedChange }) => {
  const [status, setStatus] = useState('idle'); // idle|checking|sending|sent|verifying|verified|error
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaId = useId().replace(/:/g, '_');
  const recaptchaContainerId = `recaptcha_phone_otp_${recaptchaId}`;

  const normalizedPhone = useMemo(() => String(phoneNumber || '').replace(/\D/g, ''), [phoneNumber]);
  const isPhoneValid = normalizedPhone.length === 10;
  const phoneE164 = isPhoneValid ? `+91${normalizedPhone}` : '';

  useEffect(() => {
    setOtp('');
    setConfirmationResult(null);
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

  const handleSendOtp = async () => {
    if (!isPhoneValid) {
      setStatus('error');
      setMessage('Enter a valid 10-digit mobile number first');
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      const verifier = getOrCreateRecaptchaVerifier(recaptchaContainerId);
      const result = await sendPhoneOtp(phoneE164, verifier);
      setConfirmationResult(result);
      setStatus('sent');
      setMessage(`OTP sent to ${phoneE164}`);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult) {
      setStatus('error');
      setMessage('Please request OTP first');
      return;
    }
    if (!otp || otp.length < 6) {
      setStatus('error');
      setMessage('Please enter the 6-digit OTP');
      return;
    }
    setStatus('verifying');
    setMessage('');
    try {
      const cred = await confirmationResult.confirm(otp);
      const idToken = await cred.user.getIdToken();
      await api.verifyPhoneOtp(userId, normalizedPhone, idToken);
      setStatus('verified');
      setMessage('Phone verified successfully');
      onVerifiedChange?.(true);
      setOtp('');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Invalid OTP. Please try again.');
      onVerifiedChange?.(false);
    }
  };

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
            disabled={!isPhoneValid || status === 'sending' || status === 'verifying' || status === 'checking'}
          >
            {status === 'sending' ? 'Sending OTP...' : 'Send OTP'}
          </button>
          {status === 'sent' || status === 'verifying' || status === 'error' ? (
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
