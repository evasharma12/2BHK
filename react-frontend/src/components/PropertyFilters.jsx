import React, { useState, useEffect, useRef, useMemo } from 'react';
import './PropertyFilters.css';
import { api } from '../utils/api';

function buildDraftFromFilters(f) {
  return {
    propertyFor: f.propertyFor || 'all',
    bhk: f.bhk || '',
    propertyType: f.propertyType || '',
    furnishing: f.furnishing || '',
    minPrice: f.minPrice || '',
    maxPrice: f.maxPrice || '',
    location: f.location || '',
    lat: f.lat || '',
    lng: f.lng || '',
    radiusKm: f.radiusKm || '10',
  };
}

function appliedFiltersSignature(f) {
  return [
    f.propertyFor,
    f.bhk,
    f.propertyType,
    f.furnishing,
    f.minPrice,
    f.maxPrice,
    f.location,
    f.lat,
    f.lng,
    f.radiusKm,
  ].join('\0');
}

const PropertyFilters = ({ filters, onFilterChange, onClearFilters, totalCount }) => {
  const appliedSig = useMemo(
    () => appliedFiltersSignature(filters),
    [
      filters.propertyFor,
      filters.bhk,
      filters.propertyType,
      filters.furnishing,
      filters.minPrice,
      filters.maxPrice,
      filters.location,
      filters.lat,
      filters.lng,
      filters.radiusKm,
    ]
  );

  const [draft, setDraft] = useState(() => buildDraftFromFilters(filters));
  const prevAppliedSigRef = useRef(appliedSig);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (prevAppliedSigRef.current === appliedSig) return;
    prevAppliedSigRef.current = appliedSig;
    setDraft(buildDraftFromFilters(filters));
  }, [appliedSig, filters]);

  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [locationAssistError, setLocationAssistError] = useState('');
  const skipAutocompleteForNextLocationChangeRef = useRef(false);
  const locationBlurGenRef = useRef(0);

  useEffect(() => {
    if (skipAutocompleteForNextLocationChangeRef.current) {
      skipAutocompleteForNextLocationChangeRef.current = false;
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setIsAddressLoading(false);
      return;
    }

    const query = (draft.location || '').trim();
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
  }, [draft.location]);

  const handleApply = () => {
    const radius = Number(draft.radiusKm) > 0 ? String(Number(draft.radiusKm)) : '10';
    onFilterChange({ ...draft, radiusKm: radius });
  };

  const handleLocationSuggestionSelect = async (suggestion) => {
    const description = suggestion?.description || '';
    skipAutocompleteForNextLocationChangeRef.current = true;
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
    setIsAddressLoading(false);
    setDraft((prev) => ({ ...prev, location: description, lat: '', lng: '' }));
    if (!suggestion?.place_id) {
      setLocationAssistError('');
      return;
    }
    try {
      const geo = await api.geocodeAddress({ placeId: suggestion.place_id });
      setDraft((prev) => ({
        ...prev,
        location: description,
        lat: String(geo?.location?.lat ?? ''),
        lng: String(geo?.location?.lng ?? ''),
      }));
      setLocationAssistError('');
    } catch (error) {
      setDraft((prev) => ({ ...prev, location: description, lat: '', lng: '' }));
      setLocationAssistError(
        error?.message ||
          'Could not pin exact coordinates. Search will continue using location text.'
      );
    }
  };

  const handleLocationBlur = async () => {
    const gen = ++locationBlurGenRef.current;
    const query = (draftRef.current.location || '').trim();

    if (!query) {
      setDraft((d) => ({ ...d, location: '', lat: '', lng: '' }));
      return;
    }

    setDraft((d) => ({ ...d, location: query, lat: '', lng: '' }));

    try {
      const geo = await api.geocodeAddress({ address: query });
      if (gen !== locationBlurGenRef.current) return;
      setDraft((d) => ({
        ...d,
        location: query,
        lat: String(geo?.location?.lat ?? ''),
        lng: String(geo?.location?.lng ?? ''),
      }));
      setLocationAssistError('');
    } catch (error) {
      if (gen !== locationBlurGenRef.current) return;
      setDraft((d) => ({ ...d, location: query, lat: '', lng: '' }));
      setLocationAssistError(
        error?.message ||
          'Could not pin exact coordinates. Search will continue using location text.'
      );
    }
  };

  const hasActiveFilters = () => {
    return (
      filters.propertyFor ||
      filters.bhk ||
      filters.propertyType ||
      filters.furnishing ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.location ||
      (filters.radiusKm && filters.radiusKm !== '10')
    );
  };

  return (
    <div className="property-filters">
      <div className="filters-header">
        <h3 className="filters-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
        </h3>
        {hasActiveFilters() && (
          <button type="button" className="clear-filters-btn" onClick={onClearFilters}>
            Clear All
          </button>
        )}
      </div>

      <div className="filters-count">{totalCount} properties found</div>

      <div className="filters-grid">
        <div className="filter-group">
          <span className="filter-label">Property For</span>
          <div className="filter-buttons">
            <button
              type="button"
              className={`filter-btn ${!draft.propertyFor || draft.propertyFor === 'all' ? 'active' : ''}`}
              onClick={() => setDraft((d) => ({ ...d, propertyFor: 'all' }))}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-btn ${draft.propertyFor === 'rent' ? 'active' : ''}`}
              onClick={() => setDraft((d) => ({ ...d, propertyFor: 'rent' }))}
            >
              Rent
            </button>
            <button
              type="button"
              className={`filter-btn ${draft.propertyFor === 'sell' ? 'active' : ''}`}
              onClick={() => setDraft((d) => ({ ...d, propertyFor: 'sell' }))}
            >
              Buy
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="bhk-filter" className="filter-label">
            BHK Type
          </label>
          <select
            id="bhk-filter"
            className="filter-select"
            value={draft.bhk || ''}
            onChange={(e) => setDraft((d) => ({ ...d, bhk: e.target.value }))}
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

        <div className="filter-group">
          <label htmlFor="location-filter" className="filter-label">
            Location
          </label>
          <input
            id="location-filter"
            type="text"
            className="filter-input"
            value={draft.location}
            placeholder="Search locality, area or landmark"
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
            onFocus={() => {
              if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
            }}
            onBlur={handleLocationBlur}
            autoComplete="off"
          />
          {isAddressLoading && <div className="filter-location-status">Loading suggestions...</div>}
          {locationAssistError && <div className="filter-location-status">{locationAssistError}</div>}
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

        <div className="filter-group">
          <label htmlFor="type-filter" className="filter-label">
            Property Type
          </label>
          <select
            id="type-filter"
            className="filter-select"
            value={draft.propertyType || ''}
            onChange={(e) => setDraft((d) => ({ ...d, propertyType: e.target.value }))}
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

        <div className="filter-group">
          <label htmlFor="furnishing-filter" className="filter-label">
            Furnishing
          </label>
          <select
            id="furnishing-filter"
            className="filter-select"
            value={draft.furnishing || ''}
            onChange={(e) => setDraft((d) => ({ ...d, furnishing: e.target.value }))}
          >
            <option value="">Any</option>
            <option value="fully-furnished">Fully Furnished</option>
            <option value="semi-furnished">Semi Furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="radius-filter" className="filter-label">
            Search Radius (km)
          </label>
          <input
            id="radius-filter"
            type="number"
            min="1"
            max="200"
            className="filter-input"
            value={draft.radiusKm}
            onChange={(e) => setDraft((d) => ({ ...d, radiusKm: e.target.value }))}
          />
        </div>

        <div className="filter-group filter-group--price">
          <span className="filter-label">Price Range</span>
          <div className="price-inputs">
            <input
              type="number"
              placeholder="Min Price"
              className="filter-input"
              value={draft.minPrice}
              onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))}
            />
            <span className="price-separator">to</span>
            <input
              type="number"
              placeholder="Max Price"
              className="filter-input"
              value={draft.maxPrice}
              onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="filters-apply-row">
        <button type="button" className="filters-apply-btn" onClick={handleApply}>
          Apply filters
        </button>
      </div>
    </div>
  );
};

export default PropertyFilters;
