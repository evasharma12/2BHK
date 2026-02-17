import React from 'react';
import './PropertyFilters.css';

const PropertyFilters = ({ filters, onFilterChange, onClearFilters, totalCount }) => {
  const handleChange = (name, value) => {
    onFilterChange({ ...filters, [name]: value });
  };

  const hasActiveFilters = () => {
    return filters.propertyFor || filters.bhk || filters.propertyType || 
           filters.minPrice || filters.maxPrice || filters.furnishing;
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

        {/* Price Range */}
        <div className="filter-group filter-group--price">
          <label className="filter-label">Price Range</label>
          <div className="price-inputs">
            <input
              type="number"
              placeholder="Min Price"
              className="filter-input"
              value={filters.minPrice || ''}
              onChange={(e) => handleChange('minPrice', e.target.value)}
            />
            <span className="price-separator">to</span>
            <input
              type="number"
              placeholder="Max Price"
              className="filter-input"
              value={filters.maxPrice || ''}
              onChange={(e) => handleChange('maxPrice', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyFilters;