import React from 'react';

const PropertyAmenities = ({ formData, updateFormData }) => {
  const amenitiesList = [
    { id: 'parking', label: 'Car Parking', icon: '🚗' },
    { id: 'garden', label: 'Garden', icon: '🌳' },
    { id: 'power-backup', label: 'Power Backup', icon: '⚡' },
    { id: 'cctv', label: 'CCTV Surveillance', icon: '📹' },
    { id: 'waste-disposal', label: 'Waste Disposal', icon: '🗑️' },
    { id: 'balcony', label: 'Balcony', icon: '🪟' }
  ];

  const handleAmenityToggle = (amenityId) => {
    const currentAmenities = formData.amenities || [];
    const isSelected = currentAmenities.includes(amenityId);
    
    if (isSelected) {
      updateFormData('amenities', currentAmenities.filter(id => id !== amenityId));
    } else {
      updateFormData('amenities', [...currentAmenities, amenityId]);
    }
  };

  const isAmenitySelected = (amenityId) => {
    return (formData.amenities || []).includes(amenityId);
  };

  return (
    <div className="form-section">
      <div className="amenities-info">
        <p className="field-label">Select all amenities available in your property</p>
        <p className="field-hint">This helps buyers/tenants make informed decisions</p>
      </div>

      <div className="amenities-grid">
        {amenitiesList.map((amenity) => (
          <button
            key={amenity.id}
            type="button"
            className={`amenity-card ${isAmenitySelected(amenity.id) ? 'selected' : ''}`}
            onClick={() => handleAmenityToggle(amenity.id)}
          >
            <span className="amenity-icon">{amenity.icon}</span>
            <span className="amenity-label">{amenity.label}</span>
            <div className="amenity-checkbox">
              {isAmenitySelected(amenity.id) && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="amenities-summary">
        <p className="summary-text">
          {formData.amenities?.length || 0} amenities selected
        </p>
      </div>
    </div>
  );
};

export default PropertyAmenities;