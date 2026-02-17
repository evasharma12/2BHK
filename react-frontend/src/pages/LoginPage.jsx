import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../utils/api';
import './LoginPage.css';

const LoginPage = ({ defaultMode = 'login' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(defaultMode === 'login'); // true for login, false for signup

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError('');

    try {
      const data = await api.googleAuth(credentialResponse.credential);
      
      // Store user data and token
      api.saveAuthData(data.data.token, data.data.user);

      // Redirect to requested page (e.g. /post-property) or home
      window.location.href = redirectTo;
    } catch (error) {
      console.error('Google auth error:', error);

      const message = (error?.message || '').toLowerCase();

      // Handle specific backend error from bcrypt gracefully
      if (message.includes('data and salt arguments required')) {
        if (isLoginMode) {
          setError("It looks like you haven't signed up with this Google account yet. Please switch to 'Sign up with Google' first.");
        } else {
          setError('We could not complete your Google sign-up. Please try again or use a different account.');
        }
      } else {
        setError(error.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Logo and Header */}
          <div className="login-header">
            <div className="login-logo">
              <svg width="48" height="48" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="14" fill="#2563eb"/>
                <path 
                  d="M8 14L12 10L16 14L20 10" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M12 18V10M16 18V14" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="login-title">{isLoginMode ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="login-subtitle">{isLoginMode ? 'Sign in to find your perfect property' : 'Sign up to get started'}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Google Sign-In Form */}
          <div className="login-form">
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>{isLoginMode ? 'Signing you in...' : 'Creating your account...'}</p>
              </div>
            ) : (
              <div className="google-signin-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={isLoginMode}
                  size="large"
                  width="100%"
                  text={isLoginMode ? "signin_with" : "signup_with"}
                  shape="rectangular"
                  theme="outline"
                />
              </div>
            )}

            {/* Toggle between Login and Signup */}
            <div className="auth-toggle">
              {isLoginMode ? (
                <p>
                  Don't have an account?{' '}
                  <button 
                    type="button" 
                    className="toggle-link"
                    onClick={() => setIsLoginMode(false)}
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    className="toggle-link"
                    onClick={() => setIsLoginMode(true)}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>

            <div className="benefits-list">
              <div className="benefit-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Quick and secure authentication</span>
              </div>
              <div className="benefit-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>No passwords to remember</span>
              </div>
              <div className="benefit-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Your data stays protected</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="login-terms">
            By continuing, you agree to our{' '}
            <a href="/terms" className="terms-link">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="terms-link">Privacy Policy</a>
          </div>
        </div>

        {/* Side Panel */}
        <div className="login-side-panel">
          <div className="side-panel-content">
            <h2>Find Your Dream Home</h2>
            <p>Join thousands of users who found their perfect property</p>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🏠</div>
                <h3>Verified Properties</h3>
                <p>All listings verified by our team</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h3>Best Prices</h3>
                <p>Direct deals with owners</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>Secure Platform</h3>
                <p>Your data is safe with us</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Quick Process</h3>
                <p>Find and move in days</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;