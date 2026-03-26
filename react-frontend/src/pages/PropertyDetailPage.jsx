import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ImageGallery from '../components/ImageGallery';
import ContactOwner from '../components/ContactOwner';
import { api } from '../utils/api';
import './PropertyDetailPage.css';

const PropertyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const user = api.getUser();

  useEffect(() => {
    fetchProperty(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch on id change only
  }, [id]);

  useEffect(() => {
    if (user?.user_id && id) {
      api.checkSavedProperty(user.user_id, id).then(({ saved }) => setIsSaved(!!saved)).catch(() => setIsSaved(false));
    } else {
      setIsSaved(false);
    }
  }, [user?.user_id, id]);

  const mapBackendToFrontend = (p) => {
    if (!p) return null;
    return {
      id: p.property_id,
      ownerId: p.owner_id,
      propertyFor: p.property_for,
      propertyType: p.property_type,
      bhk: p.bhk_type,
      address: p.address,
      locality: p.locality,
      city: p.city,
      state: p.state,
      pincode: p.pincode,
      builtUpArea: p.built_up_area,
      carpetArea: p.carpet_area,
      totalFloors: p.total_floors,
      floorNumber: p.floor_number,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      balconies: p.balconies,
      propertyAge: p.property_age,
      furnishing: p.furnishing,
      facing: p.facing || '',
      expectedPrice: p.expected_price,
      priceNegotiable: !!p.price_negotiable,
      maintenanceCharges: p.maintenance_charges,
      securityDeposit: p.security_deposit,
      description: p.description || '',
      availableFrom: p.available_from,
      ownerName: p.owner_name,
      ownerEmail: p.owner_email,
      ownerPhone: p.owner_phone,
      images: p.images || [],
      amenities: p.amenities || [],
      lat: p.lat != null ? Number(p.lat) : null,
      lng: p.lng != null ? Number(p.lng) : null,
    };
  };

  const fetchProperty = async (propertyId) => {
    if (!propertyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getProperty(propertyId);
      setProperty(mapBackendToFrontend(data.data));
    } catch (err) {
      console.error('Fetch property error:', err);
      setProperty(null);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price, propertyFor) => {
    const num = parseInt(price);
    if (propertyFor === 'rent') {
      if (num >= 100000) {
        return `₹${(num / 100000).toFixed(1)}L`;
      } else if (num >= 1000) {
        return `₹${(num / 1000).toFixed(0)}K`;
      }
      return `₹${num}`;
    } else {
      if (num >= 10000000) {
        return `₹${(num / 10000000).toFixed(2)} Cr`;
      } else if (num >= 100000) {
        return `₹${(num / 100000).toFixed(1)} L`;
      }
      return `₹${num}`;
    }
  };

  const getPropertyTypeLabel = (type) => {
    const labels = {
      'apartment': 'Apartment',
      'independent-house': 'Independent House',
      'villa': 'Villa',
      'builder-floor': 'Builder Floor',
      'studio': 'Studio',
      'penthouse': 'Penthouse'
    };
    return labels[type] || type;
  };

  const getAmenityLabel = (amenity) => {
    return amenity.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const propertyMapEmbedUrl = useMemo(() => {
    if (!property) return '';
    const hasCoordinates =
      Number.isFinite(property.lat) &&
      Number.isFinite(property.lng) &&
      property.lat >= -90 &&
      property.lat <= 90 &&
      property.lng >= -180 &&
      property.lng <= 180;
    if (hasCoordinates) {
      return `https://www.google.com/maps?q=${property.lat},${property.lng}&z=16&output=embed`;
    }
    const query = [property.address, property.locality, property.city, property.pincode]
      .filter(Boolean)
      .join(', ')
      .trim();
    if (!query) return '';
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
  }, [property]);

  const handleSaveClick = async () => {
    if (!user?.user_id) {
      navigate(`/login?redirect=/properties/${id}`);
      return;
    }
    setSaveLoading(true);
    try {
      if (isSaved) {
        await api.unsaveProperty(user.user_id, id);
        setIsSaved(false);
      } else {
        await api.saveProperty(user.user_id, id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Save/unsave error:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="property-detail-page">
        <div className="property-detail-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!property && !isLoading) {
    return (
      <div className="property-detail-page">
        <div className="property-detail-container">
          <div className="error-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2>Property Not Found</h2>
            <p>{error || 'The property you\'re looking for doesn\'t exist or has been removed.'}</p>
            <button className="back-btn" onClick={() => navigate('/properties')}>
              Back to Properties
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="property-detail-page">
      <div className="property-detail-container">
        {/* Back Button */}
        <button className="back-link" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>

        {/* Property Header */}
        <div className="property-header">
          <div className="header-main">
            <div className="property-badge">
              {property.propertyFor === 'rent' ? 'For Rent' : 'For Sale'}
            </div>
            <h1 className="property-title">
              {property.bhk} BHK {getPropertyTypeLabel(property.propertyType)}
            </h1>
            <div className="property-location">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {property.address}, {property.locality}, {property.city} - {property.pincode}
            </div>
          </div>
          <div className="header-price">
            <div className="price-block">
              <div className="price-amount">
                {formatPrice(property.expectedPrice, property.propertyFor)}
              </div>
              {property.propertyFor === 'rent' && (
                <div className="price-period">per month</div>
              )}
              {property.priceNegotiable && (
                <div className="negotiable-tag">Negotiable</div>
              )}
            </div>
            {user && property.ownerId && user.user_id === property.ownerId && (
              <button
                type="button"
                className="edit-property-btn"
                onClick={() => navigate(`/properties/${id}/edit`)}
                aria-label="Edit property"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            )}
            <div
              className={`save-property-btn ${isSaved ? 'saved' : ''}`}
              title={isSaved ? 'Saved' : 'Save'}
              onClick={handleSaveClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSaveClick(); } }}
              aria-label={isSaved ? 'Remove from saved' : 'Save property'}
            >
              {saveLoading ? (
                <span className="save-property-spinner" />
              ) : (
                <svg className="save-property-icon" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )}
              <span className="save-property-tooltip">{isSaved ? 'Saved' : 'Save'}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="property-content">
          {/* Left Column */}
          <div className="property-main">
            {/* Image Gallery */}
            <ImageGallery images={property.images} />

            {/* Overview */}
            <section className="detail-section">
              <h2 className="section-title">Overview</h2>
              <div className="overview-grid">
                <div className="overview-item">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <div>
                    <span className="overview-label">BHK</span>
                    <span className="overview-value">{property.bhk} BHK</span>
                  </div>
                </div>

                <div className="overview-item">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  </svg>
                  <div>
                    <span className="overview-label">Built-up Area</span>
                    <span className="overview-value">{property.builtUpArea} sq ft</span>
                  </div>
                </div>

                <div className="overview-item">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <div>
                    <span className="overview-label">Carpet Area</span>
                    <span className="overview-value">{property.carpetArea} sq ft</span>
                  </div>
                </div>

                <div className="overview-item">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 9v11a2 2 0 01-2 2H6a2 2 0 01-2-2V9"/>
                    <path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/>
                  </svg>
                  <div>
                    <span className="overview-label">Furnishing</span>
                    <span className="overview-value">
                      {property.furnishing === 'fully-furnished' ? 'Fully Furnished' :
                       property.furnishing === 'semi-furnished' ? 'Semi Furnished' : 'Unfurnished'}
                    </span>
                  </div>
                </div>

                <div className="overview-item">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                  </svg>
                  <div>
                    <span className="overview-label">Floor</span>
                    <span className="overview-value">
                      {property.floorNumber === 0 ? 'Ground' : property.floorNumber} of {property.totalFloors}
                    </span>
                  </div>
                </div>

                <div className="overview-item">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <div>
                    <span className="overview-label">Property Age</span>
                    <span className="overview-value">
                      {property.propertyAge === '0-1' ? 'Less than 1 year' :
                       property.propertyAge === '1-3' ? '1-3 years' :
                       property.propertyAge === '3-5' ? '3-5 years' :
                       property.propertyAge === '5-10' ? '5-10 years' : '10+ years'}
                    </span>
                  </div>
                </div>

                {property.facing && (
                  <div className="overview-item">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    <div>
                      <span className="overview-label">Facing</span>
                      <span className="overview-value">
                        {property.facing.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="overview-item">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                  </svg>
                  <div>
                    <span className="overview-label">Property Type</span>
                    <span className="overview-value">{getPropertyTypeLabel(property.propertyType)}</span>
                  </div>
                </div>

                {property.availableFrom && (
                  <div className="overview-item">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <div>
                      <span className="overview-label">Available From</span>
                      <span className="overview-value">
                        {(() => {
                          const d = new Date(property.availableFrom);
                          return !Number.isNaN(d.getTime())
                            ? d.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : property.availableFrom;
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Location Map */}
            {propertyMapEmbedUrl && (
              <section className="detail-section">
                <h2 className="section-title">Location</h2>
                <div className="property-map-wrap">
                  <iframe
                    title="Property location map"
                    src={propertyMapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="property-map-iframe"
                  />
                </div>
              </section>
            )}

            {/* Description */}
            <section className="detail-section">
              <h2 className="section-title">Description</h2>
              <p className="property-description">{property.description}</p>
            </section>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <section className="detail-section">
                <h2 className="section-title">Amenities</h2>
                <div className="amenities-list">
                  {property.amenities.map((amenity, index) => (
                    <div key={index} className="amenity-item">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {getAmenityLabel(amenity)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Pricing Details */}
            {property.propertyFor === 'rent' && (
              <section className="detail-section">
                <h2 className="section-title">Pricing Details</h2>
                <div className="pricing-details">
                  <div className="pricing-row">
                    <span className="pricing-label">Monthly Rent</span>
                    <span className="pricing-value">
                      {formatPrice(property.expectedPrice, 'rent')}
                    </span>
                  </div>
                  {property.maintenanceCharges && (
                    <div className="pricing-row">
                      <span className="pricing-label">Maintenance</span>
                      <span className="pricing-value">
                        ₹{parseInt(property.maintenanceCharges).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {property.securityDeposit && (
                    <div className="pricing-row">
                      <span className="pricing-label">Security Deposit</span>
                      <span className="pricing-value">
                        ₹{parseInt(property.securityDeposit).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  <div className="pricing-row pricing-row--total">
                    <span className="pricing-label">Total Move-in Cost</span>
                    <span className="pricing-value">
                      ₹{(
                        parseInt(property.expectedPrice || 0) +
                        parseInt(property.maintenanceCharges || 0) +
                        parseInt(property.securityDeposit || 0)
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Contact Owner */}
          <aside className="property-sidebar">
            <ContactOwner owner={property} propertyId={property.id} ownerId={property.ownerId} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;