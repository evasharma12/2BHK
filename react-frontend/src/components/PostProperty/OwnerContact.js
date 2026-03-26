import React from 'react';
import { Link } from 'react-router-dom';

const OwnerContact = ({ formData, updateFormData }) => {
  return (
    <div className="form-section">
      <div className="contact-info">
        <p className="field-label">Availability & Contact</p>
        <p className="field-hint">
          Your contact phone number will be taken from your verified profile details.
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
            I agree to the <Link to="/terms" className="terms-link">Terms & Conditions</Link> and{' '}
            <a href="/privacy" className="terms-link">Privacy Policy</a>.
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