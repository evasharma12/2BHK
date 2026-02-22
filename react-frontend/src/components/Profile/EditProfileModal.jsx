import React, { useState } from 'react';
import './EditProfileModal.css';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const USER_TYPES = [
  { value: 'renter', label: '🔑 Renter',        desc: 'Looking to rent a property' },
  { value: 'buyer',  label: '🏠 Buyer',          desc: 'Looking to buy a property' },
  { value: 'owner',  label: '🏢 Property Owner', desc: 'I have properties to list' },
  { value: 'both',   label: '⚡ Both',            desc: 'I own and rent properties' },
];

const EditProfileModal = ({ user, onSave, onClose }) => {
  const [form, setForm] = useState({
    full_name:  user.full_name  || '',
    phone:      user.phone_numbers?.split(',')[0] || '',
    user_type:  user.user_type  || 'renter',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]       = useState('');

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/api/users/${user.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: form.full_name,
          user_type: form.user_type,
        })
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Failed to update profile');
        return;
      }

      // Update phone separately if changed
      if (form.phone && form.phone !== user.phone_numbers?.split(',')[0]) {
        await fetch(`${API_URL}/api/users/${user.user_id}/phone`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ phone_number: form.phone })
        });
      }

      // Return updated user object to parent
      onSave({
        ...user,
        full_name: form.full_name,
        user_type: form.user_type,
        phone_numbers: form.phone || user.phone_numbers,
      });

    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal__header">
          <h2 className="modal__title">Edit Profile</h2>
          <button className="modal__close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal__body">

          {/* Avatar (read-only, from Google) */}
          <div className="modal__avatar-row">
            {user.profile_image ? (
              <img src={user.profile_image} alt="" className="modal__avatar" />
            ) : (
              <div className="modal__avatar modal__avatar--initials">
                {(user.full_name?.[0] ?? '?').toUpperCase()}
              </div>
            )}
            <div>
              <p className="modal__avatar-label">{user.email}</p>
              <p className="modal__avatar-note">Profile picture managed via Google</p>
            </div>
          </div>

          {/* Full Name */}
          <div className="modal__field">
            <label className="modal__label">Full Name</label>
            <input
              type="text"
              className="modal__input"
              value={form.full_name}
              onChange={e => handleChange('full_name', e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          {/* Phone */}
          <div className="modal__field">
            <label className="modal__label">Phone Number</label>
            <div className="modal__input-with-prefix">
              <span className="modal__input-prefix">+91</span>
              <input
                type="tel"
                className="modal__input modal__input--prefixed"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            </div>
          </div>

          {/* User Type */}
          <div className="modal__field">
            <label className="modal__label">I am a...</label>
            <div className="modal__type-grid">
              {USER_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  className={`modal__type-card ${form.user_type === type.value ? 'modal__type-card--active' : ''}`}
                  onClick={() => handleChange('user_type', type.value)}
                >
                  <span className="modal__type-label">{type.label}</span>
                  <span className="modal__type-desc">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="modal__error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="modal__actions">
            <button type="button" className="modal__btn modal__btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal__btn modal__btn--save" disabled={isSaving}>
              {isSaving ? (
                <><span className="modal__btn-spinner" /> Saving...</>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;