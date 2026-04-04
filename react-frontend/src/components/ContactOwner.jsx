import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginPathWithRedirect } from '../utils/authRedirect';
import { api } from '../utils/api';
import './ContactOwner.css';

const ContactOwner = ({ owner, propertyId, ownerId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  const currentUser = api.getUser();
  const ownerUserId = ownerId || owner?.ownerId || owner?.owner_id;
  const isOwnProperty =
    currentUser?.user_id != null &&
    ownerUserId != null &&
    Number(currentUser.user_id) === Number(ownerUserId);

  const handleStartOrOpenChat = async () => {
    if (!currentUser?.user_id) {
      navigate(loginPathWithRedirect(location));
      return;
    }

    if (!propertyId || isOwnProperty) return;

    setChatError('');
    setChatLoading(true);
    try {
      const response = await api.createOrGetChatThread(propertyId);
      const threadId =
        response?.data?.thread_id || response?.data?.threadId || response?.data?.id || null;

      navigate('/profile?tab=chats', {
        state: threadId ? { selectedThreadId: threadId } : undefined,
      });
    } catch (error) {
      setChatError(error?.message || 'Unable to open chat right now. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="contact-owner">
      <h3 className="contact-title">Contact Owner</h3>
      
      <div className="owner-info">
        <div className="owner-avatar">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div className="owner-details">
          <h4 className="owner-name">{owner?.ownerName || owner?.owner_name || 'Property Owner'}</h4>
          <p className="owner-label">Property Owner</p>
        </div>
      </div>

      <div className="contact-details">
        <div className="contact-item">
          <div className="contact-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </div>
          <div className="contact-content">
            <span className="contact-label">Phone</span>
            <a href={`tel:${owner?.ownerPhone}`} className="contact-value">
              {owner?.ownerPhone || owner?.owner_phone || '+91 XXXXXXXXXX'}
            </a>
          </div>
        </div>

        <div className="contact-actions">
          <a href={`tel:${owner?.ownerPhone}`} className="contact-action-btn contact-action-btn--call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            Call Now
          </a>
          <button
            type="button"
            className="contact-action-btn contact-action-btn--chat"
            onClick={handleStartOrOpenChat}
            disabled={chatLoading || !propertyId || isOwnProperty}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            {chatLoading ? 'Opening Chat...' : 'Start Chat'}
          </button>
        </div>
        {isOwnProperty && (
          <p className="contact-chat-info">You cannot start a chat on your own property listing.</p>
        )}
        {chatError && <p className="contact-chat-error">{chatError}</p>}
      </div>

    </div>
  );
};

export default ContactOwner;