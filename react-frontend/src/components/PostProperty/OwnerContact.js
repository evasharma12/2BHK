import React from 'react';

const OwnerContact = ({ formData, updateFormData }) => {
  return (
    <div className="form-section">
      <div className="contact-info">
        <p className="field-label">Availability & Contact</p>
        <p className="field-hint">
          Your contact details will be taken from your profile and shown to interested buyers/tenants.
        </p>
      </div>

      {/* Available From Date */}
      <div className="form-field form-field--full">
        <label htmlFor="availableFrom" className="field-label">
          {formData.propertyFor === 'rent' ? 'Available for Rent From*' : 'Available for Sale From*'}
        </label>
        <input
          type="date"
          id="availableFrom"
          className="field-input"
          value={formData.availableFrom}
          onChange={(e) => updateFormData('availableFrom', e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          required
        />
      </div>

      {/* Contact Preferences */}
      <div className="contact-preferences">
        <p className="field-label">Preferred Contact Method</p>
        <div className="preference-options">
          <label className="preference-option">
            <input
              type="radio"
              name="contactMethod"
              value="phone"
              defaultChecked
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <span>Phone Call</span>
          </label>
          <label className="preference-option">
            <input
              type="radio"
              name="contactMethod"
              value="email"
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>Email</span>
          </label>
          <label className="preference-option">
            <input
              type="radio"
              name="contactMethod"
              value="both"
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span>Both</span>
          </label>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="terms-section">
        <label className="checkbox-label checkbox-label--terms">
          <input
            type="checkbox"
            required
            className="checkbox-input"
          />
          <span className="checkbox-text">
            I confirm that I am the owner/authorized person to list this property. 
            I agree to the <a href="/terms" className="terms-link">Terms & Conditions</a> and 
            <a href="/privacy" className="terms-link"> Privacy Policy</a>.
          </span>
        </label>
      </div>

      {/* Privacy Notice */}
      <div className="privacy-notice">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <p>
          Your contact details will only be shared with verified users who show 
          interest in your property. We take your privacy seriously.
        </p>
      </div>
    </div>
  );
};

export default OwnerContact;