import React from 'react';
import './ProfileHeader.css';

const USER_TYPE_LABELS = {
  owner:  { label: 'Property Owner', color: '#7c3aed', bg: '#ede9fe' },
  renter: { label: 'Renter',         color: '#0369a1', bg: '#e0f2fe' },
  buyer:  { label: 'Buyer',          color: '#047857', bg: '#d1fae5' },
  both:   { label: 'Owner & Renter', color: '#b45309', bg: '#fef3c7' },
};

const ProfileHeader = ({ user, onEditClick }) => {
  const badge = USER_TYPE_LABELS[user.user_type] || USER_TYPE_LABELS.renter;

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? '?';

  const memberSince = new Date(user.created_at).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="profile-header">
      {/* Avatar */}
      <div className="profile-header__avatar-wrap">
        {user.profile_image ? (
          <img
            src={user.profile_image}
            alt={user.full_name}
            className="profile-header__avatar"
          />
        ) : (
          <div className="profile-header__avatar profile-header__avatar--initials">
            {initials}
          </div>
        )}
        <div className="profile-header__avatar-ring" />
      </div>

      {/* Info */}
      <div className="profile-header__info">
        <div className="profile-header__top-row">
          <h1 className="profile-header__name">{user.full_name || 'Anonymous'}</h1>
          <span
            className="profile-header__badge"
            style={{ color: badge.color, background: badge.bg }}
          >
            {badge.label}
          </span>
        </div>

        <p className="profile-header__email">{user.email}</p>

        <div className="profile-header__meta">
          {user.phone_numbers && (
            <span className="profile-header__meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 015.1 12.82a19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              {user.phone_numbers.split(',')[0]}
            </span>
          )}
          <span className="profile-header__meta-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Member since {memberSince}
          </span>
          {user.is_verified && (
            <span className="profile-header__meta-item profile-header__verified">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Edit Button */}
      <button className="profile-header__edit-btn" onClick={onEditClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit Profile
      </button>
    </div>
  );
};

export default ProfileHeader;