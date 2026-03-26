import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { api } from '../utils/api';
import PropertyFilters from '../components/PropertyFilters';
import './PropertiesListPage.css';

// Map UI sort to backend sort param (stable reference for useMemo deps)
const SORT_TO_BACKEND = { newest: 'newest', 'price-low': 'price_asc', 'price-high': 'price_desc', 'area-high': 'area_desc' };

const PropertiesListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersWrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filtersWrapRef.current && !filtersWrapRef.current.contains(e.target)) {
        setFiltersOpen(false);
      }
    };
    if (filtersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [filtersOpen]);

  // Derive API params and sidebar filter state from URL
  const apiParams = useMemo(() => {
    const sort = searchParams.get('sort') || 'newest';
    return {
      property_for: searchParams.get('property_for') || undefined,
      bhk_type: searchParams.get('bhk_type') || undefined,
      property_type: searchParams.get('property_type') || undefined,
      furnishing: searchParams.get('furnishing') || undefined,
      min_price: searchParams.get('min_price') || undefined,
      max_price: searchParams.get('max_price') || undefined,
      location: searchParams.get('location') || undefined,
      lat: searchParams.get('lat') || undefined,
      lng: searchParams.get('lng') || undefined,
      radius_km: searchParams.get('radius_km') || '10',
      sort: SORT_TO_BACKEND[sort] || sort,
    };
  }, [searchParams]);

  const filters = useMemo(() => ({
    propertyFor: searchParams.get('property_for') || 'all',
    bhk: searchParams.get('bhk_type') || '',
    propertyType: searchParams.get('property_type') || '',
    furnishing: searchParams.get('furnishing') || '',
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
    location: searchParams.get('location') || '',
    lat: searchParams.get('lat') || '',
    lng: searchParams.get('lng') || '',
    radiusKm: searchParams.get('radius_km') || '10',
  }), [searchParams]);

  // Fetch properties from backend with current URL params (server-side filtering)
  useEffect(() => {
    let cancelled = false;
    const fetchProperties = async () => {
      setIsLoading(true);
      try {
        const data = await api.getProperties(apiParams);
        if (cancelled) return;
        const backendProps = (data.data || []).map((p) => ({
          id: p.property_id,
          propertyFor: p.property_for,
          propertyType: p.property_type,
          bhk: p.bhk_type,
          locality: p.locality,
          city: p.city,
          expectedPrice: p.expected_price,
          builtUpArea: p.built_up_area,
          carpetArea: p.carpet_area,
          furnishing: p.furnishing,
          images: p.cover_image ? [p.cover_image] : [],
          amenities: [],
        }));
        setProperties(backendProps);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch properties:', err);
          setProperties([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchProperties();
    return () => { cancelled = true; };
  }, [apiParams]);

  const handleFilterChange = (newFilters) => {
    const next = new URLSearchParams(searchParams);
    const map = {
      propertyFor: 'property_for',
      bhk: 'bhk_type',
      propertyType: 'property_type',
      furnishing: 'furnishing',
      minPrice: 'min_price',
      maxPrice: 'max_price',
      location: 'location',
      lat: 'lat',
      lng: 'lng',
      radiusKm: 'radius_km',
    };
    Object.entries(map).forEach(([uiKey, paramKey]) => {
      const v = newFilters[uiKey];
      if (v && v !== 'all') next.set(paramKey, v);
      else next.delete(paramKey);
    });
    setSearchParams(next);
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  const handleSortChange = (sort) => {
    const next = new URLSearchParams(searchParams);
    if (sort && sort !== 'newest') next.set('sort', sort);
    else next.delete('sort');
    setSearchParams(next);
  };

  const sortBy = searchParams.get('sort') || 'newest';
  const activeFilterCount = [
    filters.propertyFor && filters.propertyFor !== 'all',
    filters.bhk,
    filters.propertyType,
    filters.furnishing,
    filters.minPrice,
    filters.maxPrice,
    filters.location,
    filters.radiusKm && filters.radiusKm !== '10',
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="properties-page">
        <div className="properties-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading properties...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="properties-page">
      <div className="properties-container">
        <div className="properties-header">
          <div className="header-content">
            <h1 className="page-title">Available Properties</h1>
            <p className="page-subtitle">
              Find your perfect home from our extensive listings
            </p>
          </div>

          <div className="header-actions">
            {/* Filters dropdown */}
            <div className="filters-dropdown-wrap" ref={filtersWrapRef}>
              <button
                type="button"
                className={`filters-trigger ${filtersOpen ? 'filters-trigger--open' : ''}`}
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-expanded={filtersOpen}
                aria-haspopup="true"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="filters-trigger-badge">{activeFilterCount}</span>
                )}
              </button>
              {filtersOpen && (
                <div className="filters-dropdown-panel">
                  <PropertyFilters
                    filters={filters}
                    onFilterChange={(f) => { handleFilterChange(f); }}
                    onClearFilters={() => { handleClearFilters(); setFiltersOpen(false); }}
                    totalCount={properties.length}
                  />
                </div>
              )}
            </div>

            {/* Sort by */}
            <div className="sort-section">
              <label htmlFor="sort-select" className="sort-label">Sort by</label>
              <select
                id="sort-select"
                className="sort-select"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="area-high">Area: Largest First</option>
              </select>
            </div>
          </div>
        </div>

        <div className="properties-layout">
          <main className="properties-main">
            {properties.length > 0 ? (
              <div className="properties-grid">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="no-properties">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <h3>No properties found</h3>
                <p>Try adjusting your filters to see more results</p>
                <button className="reset-btn" onClick={handleClearFilters}>
                  Clear All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default PropertiesListPage;