import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginPathWithRedirect } from '../utils/authRedirect';
import PostProperty from '../components/PostProperty/PostProperty';
import PhoneOtpVerifier from '../components/common/PhoneOtpVerifier';
import { api } from '../utils/api';
import './PostPropertyPage.css';

function devPrefillPhone10() {
  if (process.env.NODE_ENV !== 'development') return '';
  const raw = process.env.REACT_APP_DEV_PREFILL_PHONE;
  if (!raw) return '';
  return String(raw).replace(/\D/g, '').slice(0, 10);
}

const PostPropertyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const boot = async () => {
      const localUser = api.getUser();
      if (!localUser) {
        navigate(loginPathWithRedirect(location));
        return;
      }
      try {
        const freshUser = await api.getCurrentUser();
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
        const primaryPhone = freshUser?.phone_numbers?.split(',')?.[0]?.trim() || '';
        setPhoneInput(primaryPhone || devPrefillPhone10());
      } catch (_) {
        setUser(localUser);
        const primaryPhone = localUser?.phone_numbers?.split(',')?.[0]?.trim() || '';
        setPhoneInput(primaryPhone || devPrefillPhone10());
      } finally {
        setIsChecking(false);
      }
    };
    boot();
  }, [navigate, location]);

  const needsPhoneOnboarding = useMemo(() => {
    return !phoneInput || !isVerified;
  }, [phoneInput, isVerified]);

  return (
    <div className="post-property-page-wrapper">
      {isChecking ? (
        <div className="phone-gate-card">
          <h2>Checking your profile...</h2>
        </div>
      ) : needsPhoneOnboarding ? (
        <div className="phone-gate-card">
          <h2>Verify phone number to continue</h2>
          <p>Add and verify your mobile number once. Then you can post properties without OTP next time.</p>
          <div className="phone-gate-input-wrap">
            <span className="phone-gate-prefix">+91</span>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10));
                setIsVerified(false);
              }}
              className="phone-gate-input"
              placeholder="10-digit mobile number"
              maxLength={10}
            />
          </div>
          <PhoneOtpVerifier
            userId={user?.user_id}
            phoneNumber={phoneInput}
            onVerifiedChange={(v) => {
              setIsVerified(v);
              if (v && user) {
                const updated = { ...user, phone_numbers: phoneInput };
                setUser(updated);
                localStorage.setItem('user', JSON.stringify(updated));
              }
            }}
          />
          {isVerified ? <div className="phone-gate-success">Verified. Opening form...</div> : null}
        </div>
      ) : (
        <PostProperty />
      )}
    </div>
  );
};

export default PostPropertyPage;