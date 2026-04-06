import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import './Navbar.css';

const Navbar = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);

    // Read user from localStorage on mount
    const storedUser = api.getUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const syncUserFromStorage = () => {
      setCurrentUser(api.getUser());
    };
    window.addEventListener('2bhk-auth-changed', syncUserFromStorage);
    return () => window.removeEventListener('2bhk-auth-changed', syncUserFromStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const loadUnreadChatCount = async () => {
      if (!currentUser) {
        if (!cancelled) setUnreadChatCount(0);
        return;
      }
      try {
        const response = await api.getChatThreads();
        const threads = Array.isArray(response?.data) ? response.data : [];
        const unread = threads.reduce((sum, thread) => {
          const count = Number(thread?.unread_count);
          return sum + (Number.isFinite(count) ? count : 0);
        }, 0);
        if (!cancelled) setUnreadChatCount(unread);
      } catch (_) {
        if (!cancelled) setUnreadChatCount(0);
      }
    };

    loadUnreadChatCount();
    if (currentUser) {
      intervalId = window.setInterval(loadUnreadChatCount, 30000);
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [currentUser]);

  const handleLogout = () => {
    api.clearAuthData();
    setCurrentUser(null);
    navigate('/');
    showToast('Successfully logged out');
  };

  const initials = currentUser
    ? (currentUser.full_name
        ? currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : (currentUser.email?.[0] || '?').toUpperCase())
    : '';

  return (
    <nav className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__container">
        {/* Logo Section */}
        <Link to="/" className="navbar__logo">
          <div className="navbar__logo-icon">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 28 28" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="14" cy="14" r="14" fill="currentColor"/>
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
          <span className="navbar__logo-text">
            Him<span className="navbar__logo-text--bold">Homes</span>
          </span>
        </Link>

        <div className="navbar__actions">
          <Link
            to={currentUser ? '/post-property' : '/login?redirect=/post-property'}
            className="navbar__button navbar__button--secondary navbar__desktop-only"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18M3 9h18M3 15h18"/>
            </svg>
            Post Property
          </Link>
          <Link to="/properties" className="navbar__button navbar__button--primary navbar__desktop-only">
            Browse Properties
          </Link>
          {currentUser ? (
            <>
              <button
                type="button"
                className="navbar__profile-button navbar__desktop-only"
                onClick={() => navigate('/profile')}
              >
                <div className="navbar__profile-avatar-wrap">
                  <div className="navbar__profile-avatar">{initials}</div>
                  {unreadChatCount > 0 && (
                    <span className="navbar__chat-badge" aria-label={`${unreadChatCount} unread chat messages`}>
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </span>
                  )}
                </div>
                <span className="navbar__profile-name">{currentUser.full_name || currentUser.email}</span>
              </button>
              <button type="button" className="navbar__button navbar__button--outline navbar__desktop-only" onClick={handleLogout}>
                Log out
              </button>
              <button
                type="button"
                className="navbar__mobile-profile-icon"
                onClick={() => navigate('/profile')}
                aria-label="Profile"
              >
                <div className="navbar__profile-avatar-wrap">
                  <div className="navbar__profile-avatar">{initials}</div>
                  {unreadChatCount > 0 && (
                    <span className="navbar__chat-badge" aria-label={`${unreadChatCount} unread chat messages`}>
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </span>
                  )}
                </div>
              </button>
            </>
          ) : (
            <>
              <Link to="/signup" className="navbar__button navbar__button--outline navbar__desktop-only">
                Sign up
              </Link>
              <Link to="/login" className="navbar__button navbar__button--outline navbar__desktop-only">
                Log in
              </Link>
              <Link to="/login" className="navbar__button navbar__button--primary navbar__mobile-signin">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;