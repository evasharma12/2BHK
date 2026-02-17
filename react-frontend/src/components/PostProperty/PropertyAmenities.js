import React from 'react';

const PropertyAmenities = ({ formData, updateFormData }) => {
  const amenitiesList = [
    { id: 'parking', label: 'Car Parking', icon: '🚗' },
    { id: 'gym', label: 'Gym', icon: '💪' },
    { id: 'swimming-pool', label: 'Swimming Pool', icon: '🏊' },
    { id: 'garden', label: 'Garden', icon: '🌳' },
    { id: 'clubhouse', label: 'Clubhouse', icon: '🏛️' },
    { id: 'kids-play-area', label: 'Kids Play Area', icon: '🎪' },
    { id: 'lift', label: 'Lift/Elevator', icon: '🛗' },
    { id: 'power-backup', label: 'Power Backup', icon: '⚡' },
    { id: 'security', label: '24/7 Security', icon: '🛡️' },
    { id: 'cctv', label: 'CCTV Surveillance', icon: '📹' },
    { id: 'water-supply', label: '24/7 Water Supply', icon: '💧' },
    { id: 'internet', label: 'Internet/WiFi', icon: '📶' },
    { id: 'intercom', label: 'Intercom', icon: '📞' },
    { id: 'maintenance-staff', label: 'Maintenance Staff', icon: '👷' },
    { id: 'visitor-parking', label: 'Visitor Parking', icon: '🅿️' },
    { id: 'fire-safety', label: 'Fire Safety', icon: '🧯' },
    { id: 'rainwater-harvesting', label: 'Rainwater Harvesting', icon: '🌧️' },
    { id: 'waste-disposal', label: 'Waste Disposal', icon: '🗑️' },
    { id: 'servant-room', label: 'Servant Room', icon: '🚪' },
    { id: 'study-room', label: 'Study Room', icon: '📚' },
    { id: 'store-room', label: 'Store Room', icon: '📦' },
    { id: 'balcony', label: 'Balcony', icon: '🪟' },
    { id: 'ac', label: 'Air Conditioning', icon: '❄️' },
    { id: 'modular-kitchen', label: 'Modular Kitchen', icon: '🍳' }
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