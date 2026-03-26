import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../utils/api';

const PropertyBasicInfo = ({
  formData,
  updateFormData,
  updateMultipleFields,
  mapValidationError = '',
}) => {
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [mapLocation, setMapLocation] = useState(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const addressWrapRef = useRef(null);

  const mapEmbedUrl = useMemo(() => {
    if (!mapLocation?.lat || !mapLocation?.lng) return '';
    return `https://www.google.com/maps?q=${mapLocation.lat},${mapLocation.lng}&z=16&output=embed`;
  }, [mapLocation]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (addressWrapRef.current && !addressWrapRef.current.contains(e.target)) {
        setShowAddressSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (formData.latitude && formData.longitude) {
      setMapLocation({ lat: Number(formData.latitude), lng: Number(formData.longitude) });
    }
  }, [formData.latitude, formData.longitude]);

  useEffect(() => {
    const query = (formData.address || '').trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setIsAddressLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsAddressLoading(true);
      setAddressError('');
      try {
        const suggestions = await api.getAddressSuggestions(query);
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(true);
      } catch (err) {
        setAddressSuggestions([]);
        setAddressError(err.message || 'Failed to fetch address suggestions');
      } finally {
        setIsAddressLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [formData.address]);

  const getAddressPart = (components, type) => {
    const match = (components || []).find((c) => (c.types || []).includes(type));
    return match?.long_name || '';
  };

  const applyGeocodeResultToForm = (geo, fallbackAddress = '') => {
    const locality =
      getAddressPart(geo.address_components, 'sublocality_level_1') ||
      getAddressPart(geo.address_components, 'sublocality') ||
      getAddressPart(geo.address_components, 'neighborhood') ||
      getAddressPart(geo.address_components, 'locality');
    const city =
      getAddressPart(geo.address_components, 'locality') ||
      getAddressPart(geo.address_components, 'administrative_area_level_2') ||
      getAddressPart(geo.address_components, 'administrative_area_level_1');
    const pincode = getAddressPart(geo.address_components, 'postal_code');

    updateMultipleFields({
      address: geo.formatted_address || fallbackAddress || formData.address,
      locality: locality || formData.locality,
      city: city || formData.city,
      pincode: pincode || formData.pincode,
      latitude: geo.location?.lat ?? '',
      longitude: geo.location?.lng ?? '',
      locationConfirmed: false,
    });
    if (geo.location?.lat && geo.location?.lng) {
      setMapLocation({ lat: geo.location.lat, lng: geo.location.lng });
    }
  };

  const handleAddressSuggestionSelect = async (suggestion) => {
    setShowAddressSuggestions(false);
    setSelectedPlaceId(suggestion.place_id || '');
    updateFormData('address', suggestion.description || '');
    setAddressError('');

    if (!suggestion.place_id) return;
    try {
      const geo = await api.geocodeAddress({ placeId: suggestion.place_id });
      applyGeocodeResultToForm(geo, suggestion.description);
    } catch (err) {
      setAddressError(err.message || 'Failed to locate selected address');
    }
  };

  const handleAddressBlur = async () => {
    const query = (formData.address || '').trim();
    if (!query || selectedPlaceId) return;

    try {
      const geo = await api.geocodeAddress({ address: query });
      applyGeocodeResultToForm(geo, query);
    } catch {
      // Do not block form entry; only skip map update when geocode fails.
    }
  };

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
        <div className="address-autocomplete-wrap" ref={addressWrapRef}>
          <input
            type="text"
            id="address"
            className="field-input"
            placeholder="Building name, street address"
            value={formData.address}
            onChange={(e) => {
              setSelectedPlaceId('');
              updateMultipleFields({
                address: e.target.value,
                latitude: '',
                longitude: '',
                locationConfirmed: false,
              });
              setMapLocation(null);
            }}
            onFocus={() => {
              if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
            }}
            onBlur={handleAddressBlur}
            autoComplete="off"
            required
          />
          {isAddressLoading && (
            <div className="address-autocomplete-status">Loading suggestions...</div>
          )}
          {addressError && (
            <div className="field-error" role="alert">{addressError}</div>
          )}
          {showAddressSuggestions && addressSuggestions.length > 0 && (
            <div className="address-suggestions-dropdown">
              {addressSuggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  className="address-suggestion-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAddressSuggestionSelect(s)}
                >
                  <span className="address-suggestion-main">
                    {s.structured_formatting?.main_text || s.description}
                  </span>
                  <span className="address-suggestion-secondary">
                    {s.structured_formatting?.secondary_text || ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-field form-field--full">
        <label className="field-label">Select Location on Map*</label>
        <div className="address-map-preview">
          {mapEmbedUrl ? (
            <>
              <iframe
                title="Property location preview"
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="address-map-iframe"
              />
              <button
                type="button"
                className="nav-btn nav-btn--primary"
                onClick={() => updateFormData('locationConfirmed', true)}
                style={{ marginTop: '0.75rem' }}
              >
                {formData.locationConfirmed ? 'Location Confirmed' : 'Use This Map Location'}
              </button>
              {(formData.latitude && formData.longitude) && (
                <p className="field-hint">
                  Coordinates: {Number(formData.latitude).toFixed(6)}, {Number(formData.longitude).toFixed(6)}
                </p>
              )}
              {mapValidationError && (
                <div className="field-error" role="alert" style={{ marginTop: '0.5rem' }}>
                  {mapValidationError}
                </div>
              )}
            </>
          ) : (
            <p className="field-hint">
              Select an address suggestion to load and confirm map coordinates.
            </p>
          )}
        </div>
      </div>

      <div className="form-field form-field--full">
        <label htmlFor="addressText" className="field-label">Address Details (Optional)</label>
        <input
          type="text"
          id="addressText"
          className="field-input"
          placeholder="Landmark, tower, floor, or nearby reference"
          value={formData.addressText || ''}
          onChange={(e) => updateFormData('addressText', e.target.value)}
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