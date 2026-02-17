import React from 'react';

const PropertyBasicInfo = ({ formData, updateFormData, updateMultipleFields }) => {
  return (
    <div className="form-section">
      {/* Property For Toggle */}
      <div className="form-field form-field--full">
        <label className="field-label">I want to*</label>
        <div className="toggle-buttons">
          <button
            type="button"
            className={`toggle-option ${formData.propertyFor === 'rent' ? 'active' : ''}`}
            onClick={() => updateFormData('propertyFor', 'rent')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Rent out my property
          </button>
          <button
            type="button"
            className={`toggle-option ${formData.propertyFor === 'sell' ? 'active' : ''}`}
            onClick={() => updateFormData('propertyFor', 'sell')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <path d="M9 22V12h6v10"/>
            </svg>
            Sell my property
          </button>
        </div>
      </div>

      {/* Property Type */}
      <div className="form-field form-field--full">
        <label htmlFor="propertyType" className="field-label">Property Type*</label>
        <select
          id="propertyType"
          className="field-input field-select"
          value={formData.propertyType}
          onChange={(e) => updateFormData('propertyType', e.target.value)}
          required
        >
          <option value="">Select Property Type</option>
          <option value="apartment">Apartment</option>
          <option value="independent-house">Independent House</option>
          <option value="villa">Villa</option>
          <option value="builder-floor">Builder Floor</option>
          <option value="studio">Studio Apartment</option>
          <option value="penthouse">Penthouse</option>
          <option value="commercial">Commercial Space</option>
        </select>
      </div>

      {/* BHK Configuration */}
      <div className="form-field">
        <label htmlFor="bhk" className="field-label">BHK Type*</label>
        <select
          id="bhk"
          className="field-input field-select"
          value={formData.bhk}
          onChange={(e) => updateFormData('bhk', e.target.value)}
          required
        >
          <option value="">Select BHK</option>
          <option value="1">1 BHK</option>
          <option value="1.5">1.5 BHK</option>
          <option value="2">2 BHK</option>
          <option value="2.5">2.5 BHK</option>
          <option value="3">3 BHK</option>
          <option value="3.5">3.5 BHK</option>
          <option value="4">4 BHK</option>
          <option value="4+">4+ BHK</option>
        </select>
      </div>

      {/* Location Fields */}
      <div className="form-field form-field--full">
        <label htmlFor="address" className="field-label">Property Address*</label>
        <input
          type="text"
          id="address"
          className="field-input"
          placeholder="Building name, street address"
          value={formData.address}
          onChange={(e) => updateFormData('address', e.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="locality" className="field-label">Locality/Area*</label>
        <input
          type="text"
          id="locality"
          className="field-input"
          placeholder="e.g., Koramangala"
          value={formData.locality}
          onChange={(e) => updateFormData('locality', e.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="city" className="field-label">City*</label>
        <input
          type="text"
          id="city"
          className="field-input"
          placeholder="Enter city name"
          value={formData.city}
          onChange={(e) => updateFormData('city', e.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="pincode" className="field-label">Pincode*</label>
        <input
          type="text"
          id="pincode"
          className="field-input"
          placeholder="6-digit pincode"
          value={formData.pincode}
          onChange={(e) => updateFormData('pincode', e.target.value)}
          pattern="[0-9]{6}"
          maxLength="6"
          required
        />
      </div>
    </div>
  );
};

export default PropertyBasicInfo;