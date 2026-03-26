import React, { useState, useEffect } from 'react';
import './PropertyFilters.css';
import { api } from '../utils/api';

const PropertyFilters = ({ filters, onFilterChange, onClearFilters, totalCount }) => {
  // Local state for price inputs so typing doesn't trigger search on every keystroke
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice || '');
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice || '');
  const [localRadiusKm, setLocalRadiusKm] = useState(filters.radiusKm || '10');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  useEffect(() => {
    setLocalMinPrice(filters.minPrice || '');
    setLocalMaxPrice(filters.maxPrice || '');
    setLocalRadiusKm(filters.radiusKm || '10');
  }, [filters.minPrice, filters.maxPrice, filters.radiusKm]);

  useEffect(() => {
    const query = (filters.location || '').trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setIsAddressLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsAddressLoading(true);
      try {
        const suggestions = await api.getAddressSuggestions(query);
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(true);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setIsAddressLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [filters.location]);

  const handleChange = (name, value) => {
    onFilterChange({ ...filters, [name]: value });
  };

  const applyPriceFilter = () => {
    const min = String(localMinPrice || '').trim();
    const max = String(localMaxPrice || '').trim();
    const radius = Number(localRadiusKm) > 0 ? String(Number(localRadiusKm)) : '10';
    onFilterChange({ ...filters, minPrice: min, maxPrice: max, radiusKm: radius });
  };

  const handleLocationSuggestionSelect = async (suggestion) => {
    const description = suggestion?.description || '';
    const next = { ...filters, location: description };
    setShowAddressSuggestions(false);
    if (!suggestion?.place_id) {
      onFilterChange(next);
      return;
    }
    try {
      const geo = await api.geocodeAddress({ placeId: suggestion.place_id });
      onFilterChange({
        ...next,
        lat: String(geo?.location?.lat ?? ''),
        lng: String(geo?.location?.lng ?? ''),
      });
    } catch {
      onFilterChange({ ...next, lat: '', lng: '' });
    }
  };

  const handleLocationBlur = async () => {
    const query = (filters.location || '').trim();
    if (!query || (filters.lat && filters.lng)) return;
    try {
      const geo = await api.geocodeAddress({ address: query });
      onFilterChange({
        ...filters,
        lat: String(geo?.location?.lat ?? ''),
        lng: String(geo?.location?.lng ?? ''),
      });
    } catch {
      // Keep text location if geocoding fails.
    }
  };

  const hasActiveFilters = () => {
    return filters.propertyFor || filters.bhk || filters.propertyType || 
           filters.minPrice || filters.maxPrice || filters.furnishing || filters.location ||
           (filters.radiusKm && filters.radiusKm !== '10');
  };

  return (
    <div className="property-filters">
      <div className="filters-header">
        <h3 className="filters-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filters
        </h3>
        {hasActiveFilters() && (
          <button className="clear-filters-btn" onClick={onClearFilters}>
            Clear All
          </button>
        )}
      </div>

      <div className="filters-count">
        {totalCount} properties found
      </div>

      <div className="filters-grid">
        {/* Property For */}
        <div className="filter-group">
          <label className="filter-label">Property For</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${!filters.propertyFor || filters.propertyFor === 'all' ? 'active' : ''}`}
              onClick={() => handleChange('propertyFor', 'all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filters.propertyFor === 'rent' ? 'active' : ''}`}
              onClick={() => handleChange('propertyFor', 'rent')}
            >
              Rent
            </button>
            <button
              className={`filter-btn ${filters.propertyFor === 'sell' ? 'active' : ''}`}
              onClick={() => handleChange('propertyFor', 'sell')}
            >
              Buy
            </button>
          </div>
        </div>

        {/* BHK Type */}
        <div className="filter-group">
          <label htmlFor="bhk-filter" className="filter-label">BHK Type</label>
          <select
            id="bhk-filter"
            className="filter-select"
            value={filters.bhk || ''}
            onChange={(e) => handleChange('bhk', e.target.value)}
          >
            <option value="">All BHK</option>
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

        {/* Location + Radius */}
        <div className="filter-group">
          <label htmlFor="location-filter" className="filter-label">Location</label>
          <input
            id="location-filter"
            type="text"
            className="filter-input"
            value={filters.location || ''}
            placeholder="Search locality, area or landmark"
            onChange={(e) => onFilterChange({ ...filters, location: e.target.value, lat: '', lng: '' })}
            onFocus={() => {
              if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
            }}
            onBlur={handleLocationBlur}
            autoComplete="off"
          />
          {isAddressLoading && <div className="filter-location-status">Loading suggestions...</div>}
          {showAddressSuggestions && addressSuggestions.length > 0 && (
            <div className="filter-location-suggestions">
              {addressSuggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  className="filter-location-suggestion-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleLocationSuggestionSelect(s)}
                >
                  <span>{s.structured_formatting?.main_text || s.description}</span>
                  <small>{s.structured_formatting?.secondary_text || ''}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Property Type */}
        <div className="filter-group">
          <label htmlFor="type-filter" className="filter-label">Property Type</label>
          <select
            id="type-filter"
            className="filter-select"
            value={filters.propertyType || ''}
            onChange={(e) => handleChange('propertyType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="independent-house">Independent House</option>
            <option value="villa">Villa</option>
            <option value="builder-floor">Builder Floor</option>
            <option value="studio">Studio</option>
            <option value="penthouse">Penthouse</option>
          </select>
        </div>

        {/* Furnishing */}
        <div className="filter-group">
          <label htmlFor="furnishing-filter" className="filter-label">Furnishing</label>
          <select
            id="furnishing-filter"
            className="filter-select"
            value={filters.furnishing || ''}
            onChange={(e) => handleChange('furnishing', e.target.value)}
          >
            <option value="">Any</option>
            <option value="fully-furnished">Fully Furnished</option>
            <option value="semi-furnished">Semi Furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>
        </div>

        {/* Price Range - apply on blur or via Apply button; typing doesn't refetch on every keystroke */}
        <div className="filter-group filter-group--price">
          <label className="filter-label">Price Range</label>
          <div className="price-inputs">
            <input
              type="number"
              placeholder="Min Price"
              className="filter-input"
              value={localMinPrice}
              onChange={(e) => setLocalMinPrice(e.target.value)}
              onBlur={applyPriceFilter}
            />
            <span className="price-separator">to</span>
            <input
              type="number"
              placeholder="Max Price"
              className="filter-input"
              value={localMaxPrice}
              onChange={(e) => setLocalMaxPrice(e.target.value)}
              onBlur={applyPriceFilter}
            />
          </div>
          <button
            type="button"
            className="price-apply-btn"
            onClick={applyPriceFilter}
          >
            Apply
          </button>
        </div>

        <div className="filter-group">
          <label htmlFor="radius-filter" className="filter-label">Search Radius (km)</label>
          <input
            id="radius-filter"
            type="number"
            min="1"
            max="200"
            className="filter-input"
            value={localRadiusKm}
            onChange={(e) => setLocalRadiusKm(e.target.value)}
            onBlur={applyPriceFilter}
          />
        </div>
      </div>
    </div>
  );
};

export default PropertyFilters;