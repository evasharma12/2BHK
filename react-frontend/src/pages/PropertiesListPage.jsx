import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
// Map: kept for re-enable; set PROPERTIES_PAGE_MAP_ENABLED true when Google Maps JS API is fixed.
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import PropertyCard from '../components/PropertyCard';
import { api } from '../utils/api';
import PropertyFilters from '../components/PropertyFilters';
import './PropertiesListPage.css';

// Map UI sort to backend sort param (stable reference for useMemo deps)
const SORT_TO_BACKEND = { newest: 'newest', 'price-low': 'price_asc', 'price-high': 'price_desc', 'area-high': 'area_desc' };
const MAP_MARKER_CAP = 300;
const MARKER_EMPHASIS_ZOOM = 13;
const MAP_INTERACTION_DEBOUNCE_MS = 300;
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

/** When false, the page shows only the property grid (no map UI, no Maps API init). */
const PROPERTIES_PAGE_MAP_ENABLED = false;

const PropertiesListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileResultsView, setMobileResultsView] = useState('list');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [mapViewport, setMapViewport] = useState(null);
  const [selectedMapProperty, setSelectedMapProperty] = useState(null);
  const filtersWrapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const googleRef = useRef(null);
  const markerClustererRef = useRef(null);
  const mapMarkersRef = useRef([]);
  const idleListenerRef = useRef(null);
  const idleDebounceRef = useRef(null);

  const mapApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const mapApiKeySuffix = mapApiKey ? mapApiKey.slice(-6) : '';

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
          // Fallback for legacy rows where invalid ENUM values were saved as '' before enum migration.
          id: p.property_id,
          propertyFor: p.property_for,
          propertyType: p.property_type || (String(p.bhk_type || '').toLowerCase() === '1rk' ? 'pg' : ''),
          bhk: p.bhk_type,
          locality: p.locality,
          city: p.city,
          expectedPrice: p.expected_price,
          builtUpArea: p.built_up_area,
          carpetArea: p.carpet_area,
          furnishing: p.furnishing,
          pgRoomTypes: p.type_specific_data?.pg?.room_types || [],
          pgMealsAvailable: p.type_specific_data?.pg?.meals_available,
          images: p.cover_image ? [p.cover_image] : [],
          amenities: [],
          lat: Number(p.lat),
          lng: Number(p.lng),
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

  const getBhkLabel = (bhkValue) => {
    if (!bhkValue) return 'Property';
    return String(bhkValue).toLowerCase() === '1rk' ? '1 RK' : `${bhkValue} BHK`;
  };

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
  const mapCenter = useMemo(() => {
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    const firstWithCoordinates = properties.find((property) => Number.isFinite(property.lat) && Number.isFinite(property.lng));
    if (firstWithCoordinates) {
      return { lat: firstWithCoordinates.lat, lng: firstWithCoordinates.lng };
    }
    return INDIA_CENTER;
  }, [properties, searchParams]);

  const mappableProperties = useMemo(
    () => properties.filter((property) => Number.isFinite(property.lat) && Number.isFinite(property.lng)),
    [properties]
  );

  const viewportMappableProperties = useMemo(() => {
    if (!mapViewport?.bounds) return mappableProperties;
    const { north, south, east, west } = mapViewport.bounds;
    const latPadding = (north - south) * 0.15;
    const lngPadding = (east - west) * 0.15;
    const paddedNorth = north + latPadding;
    const paddedSouth = south - latPadding;
    const paddedEast = east + lngPadding;
    const paddedWest = west - lngPadding;
    return mappableProperties.filter((property) => {
      const withinLat = property.lat <= paddedNorth && property.lat >= paddedSouth;
      const withinLng = property.lng <= paddedEast && property.lng >= paddedWest;
      return withinLat && withinLng;
    });
  }, [mappableProperties, mapViewport]);

  const markerCapReached = viewportMappableProperties.length > MAP_MARKER_CAP;
  const mapRenderProperties = useMemo(
    () => viewportMappableProperties.slice(0, MAP_MARKER_CAP),
    [viewportMappableProperties]
  );

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

  useEffect(() => {
    if (!PROPERTIES_PAGE_MAP_ENABLED) return;
    if (!properties.some((property) => property.id === selectedMapProperty?.id)) {
      setSelectedMapProperty(null);
    }
  }, [properties, selectedMapProperty]);

  useEffect(() => {
    if (!PROPERTIES_PAGE_MAP_ENABLED) return undefined;
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        '[Maps Debug] keyPresent=%s keySuffix=%s',
        Boolean(mapApiKey),
        mapApiKeySuffix || '(missing)'
      );
    }
    if (!mapContainerRef.current || !mapApiKey) return undefined;
    let mounted = true;
    setOptions({
      apiKey: mapApiKey,
      version: 'weekly',
    });

    const initMap = async () => {
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[Maps Debug] Initializing map library...');
        }
        const { Map } = await importLibrary('maps');
        if (!mounted || mapInstanceRef.current) return;
        const map = new Map(mapContainerRef.current, {
          center: mapCenter,
          zoom: Number.isFinite(Number(searchParams.get('lat'))) ? MARKER_EMPHASIS_ZOOM : 11,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          gestureHandling: 'greedy',
        });
        mapInstanceRef.current = map;
        googleRef.current = window.google;
        setMapReady(true);
        setMapError('');
        if (process.env.NODE_ENV !== 'production') {
          console.info('[Maps Debug] Map initialized successfully.');
        }

        idleListenerRef.current = map.addListener('idle', () => {
          if (idleDebounceRef.current) {
            window.clearTimeout(idleDebounceRef.current);
          }
          idleDebounceRef.current = window.setTimeout(() => {
            const bounds = map.getBounds();
            if (!bounds) return;
            const northEast = bounds.getNorthEast();
            const southWest = bounds.getSouthWest();
            setMapViewport({
              zoom: map.getZoom() || 0,
              bounds: {
                north: northEast.lat(),
                east: northEast.lng(),
                south: southWest.lat(),
                west: southWest.lng(),
              },
            });
          }, MAP_INTERACTION_DEBOUNCE_MS);
        });
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to initialize Google Maps:', err);
        if (process.env.NODE_ENV !== 'production') {
          console.error('[Maps Debug] Initialization error details:', err);
        }
        setMapError('Unable to load map right now. Please check your map API key.');
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (idleDebounceRef.current) window.clearTimeout(idleDebounceRef.current);
      if (idleListenerRef.current) {
        idleListenerRef.current.remove();
        idleListenerRef.current = null;
      }
    };
  }, [mapApiKey, mapApiKeySuffix, mapCenter, searchParams]);

  useEffect(() => {
    if (!PROPERTIES_PAGE_MAP_ENABLED) return;
    const map = mapInstanceRef.current;
    if (!map) return;
    map.panTo(mapCenter);
  }, [mapCenter]);

  useEffect(() => {
    if (!PROPERTIES_PAGE_MAP_ENABLED) return;
    const map = mapInstanceRef.current;
    const googleMaps = googleRef.current;
    if (!map || !googleMaps) return;

    mapMarkersRef.current.forEach((marker) => marker.setMap(null));
    mapMarkersRef.current = [];
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
    }

    const currentZoom = mapViewport?.zoom ?? map.getZoom() ?? 0;
    const emphasizeMarkers = currentZoom >= MARKER_EMPHASIS_ZOOM;

    const nextMarkers = mapRenderProperties.map((property) => {
      const marker = new googleMaps.maps.Marker({
        position: { lat: property.lat, lng: property.lng },
        title: `${getBhkLabel(property.bhk)} ${property.propertyType || 'Property'}`,
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE,
          scale: emphasizeMarkers ? 8 : 5,
          fillColor: emphasizeMarkers ? '#1d4ed8' : '#2563eb',
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => setSelectedMapProperty(property));
      return marker;
    });

    markerClustererRef.current = new MarkerClusterer({
      markers: nextMarkers,
      map,
    });
    mapMarkersRef.current = nextMarkers;
  }, [mapRenderProperties, mapViewport]);

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
                    onFilterChange={(f) => {
                      handleFilterChange(f);
                      setFiltersOpen(false);
                    }}
                    onClearFilters={() => {
                      handleClearFilters();
                      setFiltersOpen(false);
                    }}
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

        <div
          className={`properties-layout ${
            properties.length === 0 || !PROPERTIES_PAGE_MAP_ENABLED ? 'properties-layout--list-only' : ''
          }`}
        >
          {PROPERTIES_PAGE_MAP_ENABLED && properties.length > 0 && (
            <>
              <div className="mobile-results-toggle" role="tablist" aria-label="Results view toggle">
                <button
                  type="button"
                  className={`mobile-results-toggle-btn ${mobileResultsView === 'map' ? 'mobile-results-toggle-btn--active' : ''}`}
                  onClick={() => setMobileResultsView('map')}
                  role="tab"
                  aria-selected={mobileResultsView === 'map'}
                >
                  Map Results
                </button>
                <button
                  type="button"
                  className={`mobile-results-toggle-btn ${mobileResultsView === 'list' ? 'mobile-results-toggle-btn--active' : ''}`}
                  onClick={() => setMobileResultsView('list')}
                  role="tab"
                  aria-selected={mobileResultsView === 'list'}
                >
                  List Results
                </button>
              </div>

              <aside className={`properties-map-pane ${mobileResultsView === 'list' ? 'properties-map-pane--mobile-hidden' : ''}`}>
                <div className="properties-map-shell">
                  {!mapApiKey ? (
                    <div className="properties-map-state">
                      <p>Map unavailable: set `REACT_APP_GOOGLE_MAPS_API_KEY` to enable map results.</p>
                    </div>
                  ) : (
                    <>
                      <div ref={mapContainerRef} className="properties-map-canvas" />
                      {!mapReady && !mapError && (
                        <div className="properties-map-state">
                          <p>Loading map...</p>
                        </div>
                      )}
                      {mapError && (
                        <div className="properties-map-state">
                          <p>{mapError}</p>
                        </div>
                      )}
                      {markerCapReached && (
                        <div className="properties-map-banner">
                          Showing first {MAP_MARKER_CAP} properties in this area. Zoom in to see more.
                        </div>
                      )}
                      {selectedMapProperty && (
                        <div className="properties-map-preview">
                          <h4>{getBhkLabel(selectedMapProperty.bhk)} {selectedMapProperty.propertyType || 'Property'}</h4>
                          <p>{selectedMapProperty.locality}, {selectedMapProperty.city}</p>
                          <p className="properties-map-preview-price">INR {Number(selectedMapProperty.expectedPrice || 0).toLocaleString('en-IN')}</p>
                          <a href={`/properties/${selectedMapProperty.id}`}>View details</a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </aside>
            </>
          )}

          <main className="properties-main">
            {properties.length > 0 ? (
              <div
                className={`properties-grid ${
                  PROPERTIES_PAGE_MAP_ENABLED && mobileResultsView === 'map' ? 'properties-grid--mobile-hidden' : ''
                }`}
              >
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