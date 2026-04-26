import React from 'react';
import { Link } from 'react-router-dom';

const OwnerContact = ({ formData, updateFormData, canPostForOthers = false, isEditMode = false }) => {
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

      <div className="form-field form-field--full">
        <label htmlFor="secondaryPhoneNumber" className="field-label">
          Secondary Phone Number (Optional)
        </label>
        <input
          type="tel"
          id="secondaryPhoneNumber"
          className="field-input"
          value={formData.secondaryPhoneNumber || ''}
          onChange={(e) => updateFormData('secondaryPhoneNumber', e.target.value)}
          placeholder="e.g. 9876543210"
          inputMode="tel"
          maxLength={15}
        />
      </div>

      {canPostForOthers && !isEditMode ? (
        <>
          <div className="form-field form-field--full">
            <label className="checkbox-label">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={Boolean(formData.postForSomeoneElse)}
                onChange={(e) => updateFormData('postForSomeoneElse', e.target.checked)}
              />
              <span className="checkbox-text">
                Post this listing for someone else (Admin only)
              </span>
            </label>
          </div>

          {formData.postForSomeoneElse ? (
            <>
              <div className="form-field form-field--full">
                <label htmlFor="ownerName" className="field-label">
                  Owner Name*
                </label>
                <input
                  type="text"
                  id="ownerName"
                  className="field-input"
                  value={formData.ownerName || ''}
                  onChange={(e) => updateFormData('ownerName', e.target.value)}
                  placeholder="Enter owner full name"
                  required={Boolean(formData.postForSomeoneElse)}
                />
              </div>

              <div className="form-field form-field--full">
                <label htmlFor="ownerPhoneNumber" className="field-label">
                  Owner Phone Number*
                </label>
                <input
                  type="tel"
                  id="ownerPhoneNumber"
                  className="field-input"
                  value={formData.ownerPhoneNumber || ''}
                  onChange={(e) =>
                    updateFormData('ownerPhoneNumber', e.target.value.replace(/[^\d+]/g, '').slice(0, 15))
                  }
                  placeholder="e.g. +919876543210"
                  inputMode="tel"
                  required={Boolean(formData.postForSomeoneElse)}
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}

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

    </div>
  );
};

export default OwnerContact;