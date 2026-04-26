import React, { useState, useEffect, useRef } from 'react';
import './PropertySearchForm.css';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';

const PropertySearchForm = () => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState('rent');
  const [priceRange, setPriceRange] = useState(50000);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [locationAssistError, setLocationAssistError] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    latitude: '',
    longitude: '',
    radiusKm: '10',
    bhk: '',
    propertyType: '',
    furnishing: ''
  });

  /** When true, the next `filters.location` change came from picking a suggestion — do not run autocomplete again. */
  const skipAutocompleteForNextLocationChangeRef = useRef(false);

  useEffect(() => {
    setCurrentUser(api.getUser());
  }, []);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (skipAutocompleteForNextLocationChangeRef.current) {
      skipAutocompleteForNextLocationChangeRef.current = false;
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setIsAddressLoading(false);
      return;
    }

    const query = (filters.location || '').trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setIsAddressLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setIsAddressLoading(true);
      setLocationAssistError('');
      try {
        const suggestions = await api.getAddressSuggestions(query);
        if (cancelled) return;
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(true);
      } catch (error) {
        if (cancelled) return;
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
        setLocationAssistError(
          error?.message ||
            'Location suggestions unavailable right now. You can still search by typing location text.'
        );
      } finally {
        if (!cancelled) setIsAddressLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [filters.location]);

  const handleSuggestionSelect = async (suggestion) => {
    const description = suggestion?.description || '';
    skipAutocompleteForNextLocationChangeRef.current = true;
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
    setIsAddressLoading(false);
    handleFilterChange('location', description);
    if (!suggestion?.place_id) return;
    try {
      const geo = await api.geocodeAddress({ placeId: suggestion.place_id });
      handleFilterChange('latitude', String(geo?.location?.lat ?? ''));
      handleFilterChange('longitude', String(geo?.location?.lng ?? ''));
      setLocationAssistError('');
    } catch (error) {
      handleFilterChange('latitude', '');
      handleFilterChange('longitude', '');
      setLocationAssistError(
        error?.message ||
          'Could not pin exact coordinates. Search will continue using location text.'
      );
    }
  };

  const handleLocationBlur = async () => {
    const query = (filters.location || '').trim();
    if (!query) return;
    if (filters.latitude && filters.longitude) return;
    try {
      const geo = await api.geocodeAddress({ address: query });
      handleFilterChange('latitude', String(geo?.location?.lat ?? ''));
      handleFilterChange('longitude', String(geo?.location?.lng ?? ''));
      setLocationAssistError('');
    } catch (error) {
      // Keep text-only location when geocoding fails.
      setLocationAssistError(
        error?.message ||
          'Could not pin exact coordinates. Search will continue using location text.'
      );
    }
  };

  const handlePriceChange = (e) => {
    setPriceRange(parseInt(e.target.value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    // Backend uses 'sell' for buy
    params.set('property_for', searchType === 'buy' ? 'sell' : 'rent');
    params.set('max_price', String(priceRange));
    if (filters.location?.trim()) params.set('location', filters.location.trim());
    if (filters.latitude) params.set('lat', filters.latitude);
    if (filters.longitude) params.set('lng', filters.longitude);
    params.set('radius_km', String(Number(filters.radiusKm) > 0 ? Number(filters.radiusKm) : 10));
    if (filters.bhk) params.set('bhk_type', filters.bhk);
    if (filters.propertyType) params.set('property_type', filters.propertyType);
    if (filters.furnishing) params.set('furnishing', filters.furnishing);
    navigate(`/properties?${params.toString()}`);
  };

  const formatPrice = (price) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)} L`;
    } else if (price >= 1000) {
      return `₹${(price / 1000).toFixed(0)} K`;
    }
    return `₹${price}`;
  };

  const getMaxPrice = () => {
    return searchType === 'rent' ? 100000 : 20000000;
  };

  const getPriceStep = () => {
    return searchType === 'rent' ? 1000 : 100000;
  };

  return (
    <div className={`search-form-wrapper ${mobileFormOpen ? 'mobile-form-open' : ''}`}>
      <div className="search-form-container">
        <div className="search-form-header">
          <h1 className="search-form-title">Find Your Perfect Home</h1>
          <p className="search-form-subtitle">
            Search from thousands of properties in your area
          </p>
        </div>

        {/* Search Type Toggle */}
        <div className="search-type-toggle">
          <button
            type="button"
            className={`toggle-btn ${searchType === 'rent' ? 'active' : ''}`}
            onClick={() => setSearchType('rent')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Rent
          </button>
          <button
            type="button"
            className={`toggle-btn ${searchType === 'buy' ? 'active' : ''}`}
            onClick={() => setSearchType('buy')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <path d="M9 22V12h6v10"/>
            </svg>
            Buy
          </button>
        </div>

        {/* Mobile only: compact search bar - tap to open full form */}
        <div
          className="search-form-mobile-bar"
          onClick={() => setMobileFormOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMobileFormOpen(true); } }}
          role="button"
          tabIndex={0}
          aria-label="Open search filters"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <span className="search-form-mobile-bar-placeholder">Search location, BHK, price...</span>
        </div>

        {/* Main Search Form (hidden on mobile until bar is tapped) */}
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Location Input */}
            <div className="form-group form-group--location">
              <label htmlFor="location" className="form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Location
              </label>
              <input
                type="text"
                id="location"
                className="form-input"
                placeholder="Enter locality, area or landmark"
                value={filters.location}
                onChange={(e) => {
                  handleFilterChange('location', e.target.value);
                  handleFilterChange('latitude', '');
                  handleFilterChange('longitude', '');
                }}
                onFocus={() => {
                  if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
                }}
                onBlur={handleLocationBlur}
                autoComplete="off"
              />
              {isAddressLoading && (
                <div className="search-location-status">Loading suggestions...</div>
              )}
              {locationAssistError && (
                <div className="search-location-status">{locationAssistError}</div>
              )}
              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div className="search-location-suggestions">
                  {addressSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      className="search-location-suggestion-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <span>{suggestion.structured_formatting?.main_text || suggestion.description}</span>
                      <small>{suggestion.structured_formatting?.secondary_text || ''}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* BHK Type Dropdown */}
            <div className="form-group">
              <label htmlFor="bhk" className="form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                BHK Type
              </label>
              <select
                id="bhk"
                className="form-select"
                value={filters.bhk}
                onChange={(e) => handleFilterChange('bhk', e.target.value)}
              >
                <option value="">Select BHK</option>
                <option value="1rk">1 RK</option>
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

            {/* Property Type Dropdown */}
            <div className="form-group">
              <label htmlFor="propertyType" className="form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
                Property Type
              </label>
              <select
                id="propertyType"
                className="form-select"
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="apartment">Apartment</option>
                <option value="independent-house">Independent House</option>
                <option value="villa">Villa</option>
                <option value="builder-floor">Builder Floor</option>
                <option value="studio">Studio Apartment</option>
                <option value="penthouse">Penthouse</option>
                <option value="commercial">Commercial Space</option>
                <option value="pg">PG</option>
              </select>
            </div>

            {/* Furnishing Type */}
            <div className="form-group">
              <label htmlFor="furnishing" className="form-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 9v11a2 2 0 01-2 2H6a2 2 0 01-2-2V9"/>
                  <path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/>
                </svg>
                Furnishing
              </label>
              <select
                id="furnishing"
                className="form-select"
                value={filters.furnishing}
                onChange={(e) => handleFilterChange('furnishing', e.target.value)}
              >
                <option value="">Any</option>
                <option value="fully-furnished">Fully Furnished</option>
                <option value="semi-furnished">Semi Furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>

            {/* Search Radius */}
            <div className="form-group">
              <label htmlFor="radiusKm" className="form-label">
                Search Radius (km)
              </label>
              <input
                type="number"
                id="radiusKm"
                className="form-input"
                min="1"
                max="200"
                value={filters.radiusKm}
                onChange={(e) => handleFilterChange('radiusKm', e.target.value)}
              />
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="price-range-section">
            <div className="price-range-header">
              <label className="form-label">
                <span className="form-label-rupee" aria-hidden="true">₹</span>
                Price Range
              </label>
              <span className="price-value">
                Up to {formatPrice(priceRange)}
                {searchType === 'rent' && '/month'}
              </span>
            </div>
            <input
              type="range"
              className="price-slider"
              min="0"
              max={getMaxPrice()}
              step={getPriceStep()}
              value={priceRange}
              onChange={handlePriceChange}
            />
            <div className="price-range-labels">
              <span>₹0</span>
              <span>{formatPrice(getMaxPrice())}</span>
            </div>
          </div>

          {/* Search Button */}
          <button type="submit" className="search-submit-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            Search Properties
          </button>
        </form>

        {/* Mobile only: Post Property button (same style as navbar) */}
        <div className="search-form-mobile-actions">
          <Link
            to={currentUser ? '/post-property' : '/login?redirect=/post-property'}
            className="search-form-mobile-btn search-form-mobile-btn--secondary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18M3 9h18M3 15h18"/>
            </svg>
            Post Property
          </Link>
          <Link
            to="/properties"
            className="search-form-mobile-btn search-form-mobile-btn--primary"
          >
            Browse Properties
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropertySearchForm;