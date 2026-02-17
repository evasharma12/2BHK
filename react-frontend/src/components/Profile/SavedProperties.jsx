import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ProfileTabContent.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SavedProperties = ({ userId }) => {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSavedProperties();
  }, [userId]);

  const mapSavedToCard = (p) => ({
    ...p,
    id: p.property_id,
    propertyFor: p.property_for,
    propertyType: p.property_type,
    bhk: p.bhk_type,
    expectedPrice: p.expected_price,
    builtUpArea: p.built_up_area,
    images: p.cover_image ? [p.cover_image] : [],
    amenities: [],
  });

  const fetchSavedProperties = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/${userId}/saved-properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setProperties((data.data || []).map(mapSavedToCard));
    } catch (err) {
      console.error('Failed to fetch saved properties:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsave = async (propertyId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/users/${userId}/saved-properties/${propertyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties((prev) => prev.filter((p) => p.property_id !== propertyId));
    } catch (err) {
      console.error('Failed to unsave property:', err);
    }
  };

  if (isLoading) return <TabLoader />;

  if (properties.length === 0) {
    return (
      <EmptyState
        icon="❤️"
        title="No saved properties yet"
        subtitle="Browse properties and tap the heart to save them here."
        cta={{ label: 'Browse Properties', href: '/properties' }}
      />
    );
  }

  return (
    <div className="tab-section">
      <div className="tab-section__header">
        <h2 className="tab-section__title">Saved Properties</h2>
        <span className="tab-section__count">{properties.length} saved</span>
      </div>
      <div className="property-cards-grid">
        {properties.map(property => (
          <PropertyCard
            key={property.property_id}
            property={property}
            onAction={() => handleUnsave(property.property_id)}
            actionLabel="Remove"
            actionIcon="🗑️"
          />
        ))}
      </div>
    </div>
  );
};

// Trash icon (red dustbin)
const TrashIcon = () => (
  <svg className="listed-mini-card__trash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

// ─── Listed Property Mini Card (no image, basic info, click → detail) ───────────
const ListedPropertyMiniCard = ({ property, onDelete }) => {
  const formatPrice = (price, type) => {
    const n = parseInt(price, 10);
    if (type === 'sell') {
      if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
      if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
      return `₹${(n/1000).toFixed(0)}K`;
    }
    return n >= 100000 ? `₹${(n/100000).toFixed(1)}L/mo` : `₹${(n/1000).toFixed(0)}K/mo`;
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
      onDelete(property.property_id);
    }
  };

  return (
    <Link to={`/properties/${property.property_id}`} className="listed-mini-card">
      <span className="listed-mini-card__badge">
        {property.property_for === 'rent' ? 'Rent' : 'Sale'}
      </span>
      <div className="listed-mini-card__body">
        <h3 className="listed-mini-card__title">
          {property.bhk_type} BHK · {property.locality}
        </h3>
        <p className="listed-mini-card__city">{property.city}</p>
        <p className="listed-mini-card__price">
          {formatPrice(property.expected_price, property.property_for)}
        </p>
      </div>
      <span className="listed-mini-card__arrow">→</span>
      <button
        type="button"
        className="listed-mini-card__delete-btn"
        onClick={handleDeleteClick}
        title="Delete listing"
        aria-label="Delete listing"
      >
        <TrashIcon />
      </button>
    </Link>
  );
};

// ─── My Listings (owner/both only) ─────────────────────────────────────────────
export const MyListings = ({ userId }) => {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [userId]);

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/properties/my-listings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setProperties(data.data);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (propertyId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/properties/${propertyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setProperties((prev) => prev.filter((p) => p.property_id !== propertyId));
      } else {
        alert(data.message || 'Failed to delete property');
      }
    } catch (err) {
      console.error('Failed to delete property:', err);
      alert('Failed to delete property. Please try again.');
    }
  };

  if (isLoading) return <TabLoader />;

  if (properties.length === 0) {
    return (
      <EmptyState
        icon="🏠"
        title="No listed properties yet"
        subtitle="Start listing your properties to reach thousands of potential renters and buyers."
        cta={{ label: 'Post a Property', href: '/post-property' }}
      />
    );
  }

  return (
    <div className="tab-section">
      <div className="tab-section__header">
        <h2 className="tab-section__title">Listed Properties</h2>
        <span className="tab-section__count">{properties.length} listed</span>
        <a href="/post-property" className="tab-section__action-btn">
          + Add New
        </a>
      </div>
      <div className="listed-mini-cards">
        {properties.map((property) => (
          <ListedPropertyMiniCard
            key={property.property_id}
            property={property}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};

// ─── My Inquiries ─────────────────────────────────────────────────────────────
export const MyInquiries = ({ userId, userType }) => {
  const [inquiries, setInquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInquiries();
  }, [userId]);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = userType === 'owner'
        ? `${API_URL}/api/inquiries/owner/${userId}`
        : `${API_URL}/api/inquiries/user/${userId}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setInquiries(data.data);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <TabLoader />;

  if (inquiries.length === 0) {
    return (
      <EmptyState
        icon="📬"
        title={userType === 'owner' ? 'No inquiries yet' : 'No inquiries sent'}
        subtitle={
          userType === 'owner'
            ? 'Inquiries from interested renters/buyers will appear here.'
            : 'Contact property owners — your inquiries will show here.'
        }
        cta={userType !== 'owner' ? { label: 'Browse Properties', href: '/properties' } : null}
      />
    );
  }

  return (
    <div className="tab-section">
      <div className="tab-section__header">
        <h2 className="tab-section__title">
          {userType === 'owner' ? 'Inquiries Received' : 'My Inquiries'}
        </h2>
        <span className="tab-section__count">{inquiries.length} total</span>
      </div>
      <div className="inquiries-list">
        {inquiries.map(inquiry => (
          <InquiryCard key={inquiry.inquiry_id} inquiry={inquiry} userType={userType} />
        ))}
      </div>
    </div>
  );
};

// ─── Recently Viewed ──────────────────────────────────────────────────────────
export const RecentlyViewed = ({ userId }) => {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentlyViewed();
  }, [userId]);

  const fetchRecentlyViewed = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/${userId}/recently-viewed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setProperties(data.data);
    } catch (err) {
      console.error('Failed to fetch recently viewed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <TabLoader />;

  if (properties.length === 0) {
    return (
      <EmptyState
        icon="👁️"
        title="Nothing viewed yet"
        subtitle="Properties you browse will appear here so you can find them again easily."
        cta={{ label: 'Start Browsing', href: '/properties' }}
      />
    );
  }

  return (
    <div className="tab-section">
      <div className="tab-section__header">
        <h2 className="tab-section__title">Recently Viewed</h2>
        <span className="tab-section__count">{properties.length} properties</span>
      </div>
      <div className="property-cards-grid">
        {properties.map(property => (
          <PropertyCard key={property.property_id} property={property} />
        ))}
      </div>
    </div>
  );
};

// ─── Shared Sub-components ────────────────────────────────────────────────────

const PropertyCard = ({ property, showStats, onAction, actionLabel, actionIcon, editHref }) => {
  const formatPrice = (price, type) => {
    const n = parseInt(price, 10);
    if (type === 'sell') {
      if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
      if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
      return `₹${(n/1000).toFixed(0)}K`;
    }
    return n >= 100000 ? `₹${(n/100000).toFixed(1)}L/mo` : `₹${(n/1000).toFixed(0)}K/mo`;
  };

  const statusColors = {
    active:   { color: '#15803d', bg: '#dcfce7' },
    inactive: { color: '#9ca3af', bg: '#f3f4f6' },
    rented:   { color: '#1d4ed8', bg: '#dbeafe' },
    sold:     { color: '#7c3aed', bg: '#ede9fe' },
  };

  const st = statusColors[property.status] || statusColors.active;

  return (
    <div className="prop-card">
      <Link to={`/properties/${property.property_id}`} className="prop-card__image-link">
        {property.cover_image ? (
          <img src={property.cover_image} alt={property.bhk_type} className="prop-card__image" />
        ) : (
          <div className="prop-card__image prop-card__image--placeholder">🏠</div>
        )}
        <span className="prop-card__for-badge">
          {property.property_for === 'rent' ? 'Rent' : 'Sale'}
        </span>
      </Link>

      <div className="prop-card__body">
        <div className="prop-card__title-row">
          <Link to={`/properties/${property.property_id}`} className="prop-card__title">
            {property.bhk_type} BHK · {property.locality}
          </Link>
          {showStats && (
            <span className="prop-card__status-badge" style={{ color: st.color, background: st.bg }}>
              {property.status}
            </span>
          )}
        </div>

        <p className="prop-card__city">{property.city}</p>

        <div className="prop-card__footer">
          <span className="prop-card__price">
            {formatPrice(property.expected_price, property.property_for)}
          </span>

          {showStats && (
            <span className="prop-card__views">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {property.views_count ?? 0}
            </span>
          )}

          <div className="prop-card__actions">
            {editHref && (
              <a href={editHref} className="prop-card__action-btn prop-card__action-btn--edit">
                ✏️ Edit
              </a>
            )}
            {onAction && (
              <button onClick={onAction} className="prop-card__action-btn prop-card__action-btn--danger">
                {actionIcon} {actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InquiryCard = ({ inquiry, userType }) => {
  const statusColors = {
    new:            { label: 'New',          color: '#1d4ed8', bg: '#dbeafe' },
    contacted:      { label: 'Contacted',    color: '#b45309', bg: '#fef3c7' },
    interested:     { label: 'Interested',   color: '#15803d', bg: '#dcfce7' },
    'not-interested': { label: 'Not Interested', color: '#9ca3af', bg: '#f3f4f6' },
    closed:         { label: 'Closed',       color: '#6b7280', bg: '#f3f4f6' },
  };

  const st = statusColors[inquiry.status] || statusColors.new;

  return (
    <div className="inquiry-card">
      <div className="inquiry-card__left">
        <Link to={`/properties/${inquiry.property_id}`} className="inquiry-card__property">
          {inquiry.property_title || `Property #${inquiry.property_id}`}
        </Link>
        {userType === 'owner' && (
          <p className="inquiry-card__from">
            From: <strong>{inquiry.inquirer_name}</strong> · {inquiry.inquirer_phone}
          </p>
        )}
        {inquiry.message && (
          <p className="inquiry-card__message">"{inquiry.message}"</p>
        )}
        <span className="inquiry-card__date">
          {new Date(inquiry.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}
        </span>
      </div>
      <span className="inquiry-card__status" style={{ color: st.color, background: st.bg }}>
        {st.label}
      </span>
    </div>
  );
};

const TabLoader = () => (
  <div className="tab-loader">
    {[1, 2, 3].map(i => (
      <div key={i} className="tab-loader__card">
        <div className="tab-loader__image skeleton" />
        <div className="tab-loader__lines">
          <div className="skeleton" style={{ height: 18, width: '70%' }} />
          <div className="skeleton" style={{ height: 14, width: '50%' }} />
          <div className="skeleton" style={{ height: 14, width: '40%' }} />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ icon, title, subtitle, cta }) => (
  <div className="empty-state">
    <div className="empty-state__icon">{icon}</div>
    <h3 className="empty-state__title">{title}</h3>
    <p className="empty-state__subtitle">{subtitle}</p>
    {cta && (
      <a href={cta.href} className="empty-state__btn">{cta.label}</a>
    )}
  </div>
);

export default SavedProperties;