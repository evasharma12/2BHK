import React from 'react';

const PropertyDetails = ({ formData, updateFormData }) => {
  const isPgProperty = formData.propertyType === 'pg';
  const roomTypes = Array.isArray(formData.roomTypes) ? formData.roomTypes : [];

  const updateRoomType = (index, field, value) => {
    const nextRoomTypes = roomTypes.map((roomType, roomTypeIndex) => (
      roomTypeIndex === index ? { ...roomType, [field]: value } : roomType
    ));
    updateFormData('roomTypes', nextRoomTypes);
  };

  const addRoomType = () => {
    updateFormData('roomTypes', [...roomTypes, { type: '', count: '' }]);
  };

  const removeRoomType = (index) => {
    if (roomTypes.length <= 1) return;
    updateFormData('roomTypes', roomTypes.filter((_, roomTypeIndex) => roomTypeIndex !== index));
  };

  return (
    <div className="form-section">
      {!isPgProperty && (
        <>
          {/* Area Details */}
          <div className="form-field">
            <label htmlFor="builtUpArea" className="field-label">Built-up Area (sq ft) (Optional)</label>
            <input
              type="number"
              id="builtUpArea"
              className="field-input"
              placeholder="e.g., 1200"
              value={formData.builtUpArea}
              onChange={(e) => updateFormData('builtUpArea', e.target.value)}
              min="100"
            />
          </div>

          <div className="form-field">
            <label htmlFor="carpetArea" className="field-label">Carpet Area (sq ft)*</label>
            <input
              type="number"
              id="carpetArea"
              className="field-input"
              placeholder="e.g., 1000"
              value={formData.carpetArea}
              onChange={(e) => updateFormData('carpetArea', e.target.value)}
              min="100"
              required
            />
          </div>
        </>
      )}

      {/* Floor Details */}
      <div className="form-field">
        <label htmlFor="totalFloors" className="field-label">Total Floors in Building*</label>
        <input
          type="number"
          id="totalFloors"
          className="field-input"
          placeholder="e.g., 10"
          value={formData.totalFloors}
          onChange={(e) => updateFormData('totalFloors', e.target.value)}
          min="1"
          max="100"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="floorNumber" className="field-label">Property on Floor*</label>
        <input
          type="number"
          id="floorNumber"
          className="field-input"
          placeholder="e.g., 5"
          value={formData.floorNumber}
          onChange={(e) => updateFormData('floorNumber', e.target.value)}
          min="0"
          required
        />
        <span className="field-hint">Enter 0 for Ground Floor</span>
      </div>

      {/* Property Age */}
      <div className="form-field">
        <label htmlFor="propertyAge" className="field-label">Property Age (Optional)</label>
        <select
          id="propertyAge"
          className="field-input field-select"
          value={formData.propertyAge}
          onChange={(e) => updateFormData('propertyAge', e.target.value)}
        >
          <option value="">Select Age (Optional)</option>
          <option value="0-1">Less than 1 year</option>
          <option value="1-3">1-3 years</option>
          <option value="3-5">3-5 years</option>
          <option value="5-10">5-10 years</option>
          <option value="10+">10+ years</option>
        </select>
      </div>

      {!isPgProperty && (
        <div className="form-field">
          <label htmlFor="furnishing" className="field-label">Furnishing Status*</label>
          <select
            id="furnishing"
            className="field-input field-select"
            value={formData.furnishing}
            onChange={(e) => updateFormData('furnishing', e.target.value)}
            required
          >
            <option value="">Select Furnishing</option>
            <option value="fully-furnished">Fully Furnished</option>
            <option value="semi-furnished">Semi Furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>
        </div>
      )}

      {isPgProperty && (
        <>
          <div className="form-field form-field--full">
            <label className="field-label">PG Room Types*</label>
            <span className="field-hint">Add all room configurations with available room count.</span>
          </div>
          {roomTypes.map((roomType, index) => (
            <React.Fragment key={`room-type-${index}`}>
              <div className="form-field">
                <label htmlFor={`roomType-${index}`} className="field-label">Room Type*</label>
                <select
                  id={`roomType-${index}`}
                  className="field-input field-select"
                  value={roomType.type}
                  onChange={(e) => updateRoomType(index, 'type', e.target.value)}
                  required
                >
                  <option value="">Select room type</option>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="triple">Triple</option>
                  <option value="dormitory">Dormitory</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor={`roomCount-${index}`} className="field-label">Count*</label>
                <input
                  type="number"
                  id={`roomCount-${index}`}
                  className="field-input"
                  placeholder="e.g., 4"
                  value={roomType.count}
                  onChange={(e) => updateRoomType(index, 'count', e.target.value)}
                  min="1"
                  required
                />
                {roomTypes.length > 1 && (
                  <button
                    type="button"
                    className="nav-btn nav-btn--secondary"
                    style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem' }}
                    onClick={() => removeRoomType(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </React.Fragment>
          ))}

          <div className="form-field form-field--full">
            <button
              type="button"
              className="nav-btn nav-btn--secondary"
              style={{ padding: '0.6rem 1rem' }}
              onClick={addRoomType}
            >
              Add Another Room Type
            </button>
          </div>

          <div className="form-field">
            <label htmlFor="mealsAvailable" className="field-label">Meals Available*</label>
            <select
              id="mealsAvailable"
              className="field-input field-select"
              value={
                formData.mealsAvailable === ''
                  ? ''
                  : formData.mealsAvailable
                    ? 'yes'
                    : 'no'
              }
              onChange={(e) => {
                if (e.target.value === '') {
                  updateFormData('mealsAvailable', '');
                } else {
                  updateFormData('mealsAvailable', e.target.value === 'yes');
                }
              }}
              required
            >
              <option value="">Select meals option</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </>
      )}

      {/* Facing Direction */}
      <div className="form-field">
        <label htmlFor="facing" className="field-label">Property Facing (Optional)</label>
        <select
          id="facing"
          className="field-input field-select"
          value={formData.facing}
          onChange={(e) => updateFormData('facing', e.target.value)}
        >
          <option value="">Select Direction (Optional)</option>
          <option value="north">North</option>
          <option value="south">South</option>
          <option value="east">East</option>
          <option value="west">West</option>
          <option value="north-east">North-East</option>
          <option value="north-west">North-West</option>
          <option value="south-east">South-East</option>
          <option value="south-west">South-West</option>
        </select>
      </div>

      {/* Property Description */}
      <div className="form-field form-field--full">
        <label htmlFor="description" className="field-label">Property Description*</label>
        <textarea
          id="description"
          className="field-input field-textarea"
          placeholder="Describe your property, mention key features, nearby landmarks, etc."
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          rows="6"
          required
        />
        <span className="field-hint">Minimum 50 characters</span>
      </div>
    </div>
  );
};

export default PropertyDetails;