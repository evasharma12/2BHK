import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import './Navbar.css';

const Navbar = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const toggleMenu = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMenuOpen((prev) => !prev);
  }, []);

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
    setMenuOpen(false);
    navigate('/');
    showToast('Successfully logged out');
  };

  const closeMenu = () => setMenuOpen(false);

  const initials = currentUser
    ? (currentUser.full_name
        ? currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : (currentUser.email?.[0] || '?').toUpperCase())
    : '';

  return (
    <>
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
            Property<span className="navbar__logo-text--bold">Bazaar</span>
          </span>
        </Link>

        {/* Action Buttons (visible on desktop) */}
        <div className="navbar__actions">
          <Link
            to={currentUser ? '/post-property' : '/login?redirect=/post-property'}
            className="navbar__button navbar__button--secondary navbar__action-item"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18M3 9h18M3 15h18"/>
            </svg>
            Post Property
          </Link>
          <Link to="/properties" className="navbar__button navbar__button--primary navbar__action-item">
            Browse Properties
          </Link>
          {currentUser ? (
            <>
              <button
                type="button"
                className="navbar__profile-button navbar__action-item"
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
              <button type="button" className="navbar__button navbar__button--outline navbar__action-item" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/signup" className="navbar__button navbar__button--outline navbar__action-item">Sign up</Link>
              <Link to="/login" className="navbar__button navbar__button--outline navbar__action-item">Log in</Link>
            </>
          )}

          {/* Menu toggle (visible on mobile only) - wrapper ensures a large hit area */}
          <div
            className="navbar__menu-toggle-wrap"
            role="button"
            tabIndex={0}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={toggleMenu}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(e); } }}
          >
            <button
              type="button"
              className={`navbar__menu-toggle ${menuOpen ? 'navbar__menu-toggle--open' : ''}`}
              aria-hidden="true"
              tabIndex={-1}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
              <span className="navbar__menu-text">Menu</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
    <>
      {/* Mobile dropdown via Portal - rendered at body root so nothing can block the button */}
      {menuOpen && createPortal(
        <div className="navbar__dropdown-portal">
          <div className="navbar__dropdown-backdrop" onClick={closeMenu} onTouchEnd={(e) => { e.preventDefault(); closeMenu(); }} />
          <div className="navbar__dropdown-panel">
            {currentUser ? (
              <>
                <button type="button" className="navbar__dropdown-item navbar__dropdown-item--profile" onClick={() => { closeMenu(); navigate('/profile'); }}>
                  <div className="navbar__profile-avatar-wrap">
                    <div className="navbar__profile-avatar">{initials}</div>
                    {unreadChatCount > 0 && (
                      <span className="navbar__chat-badge" aria-label={`${unreadChatCount} unread chat messages`}>
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </span>
                    )}
                  </div>
                  <span>Profile</span>
                </button>
                <button type="button" className="navbar__dropdown-item navbar__dropdown-item--logout" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/signup" className="navbar__dropdown-item" onClick={closeMenu}>Sign up</Link>
                <Link to="/login" className="navbar__dropdown-item" onClick={closeMenu}>Log in</Link>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
    </>
  );
};

export default Navbar;