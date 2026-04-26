import React from 'react';
import { Link } from 'react-router-dom';
import './PropertyCard.css';

const DEFAULT_NO_IMAGE_URL = 'https://skhcn.hatinh.gov.vn/storage/images1685430_4.jpg';

const PropertyCard = ({ property }) => {
  const {
    id,
    images,
    propertyFor,
    propertyType,
    bhk,
    locality,
    city,
    expectedPrice,
    builtUpArea,
    furnishing,
    amenities
  } = property;

  const formatPrice = (price) => {
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

  const getBhkLabel = (bhkValue) => {
    if (!bhkValue) return '';
    return String(bhkValue).toLowerCase() === '1rk' ? '1 RK' : `${bhkValue} BHK`;
  };

  const getPropertyTypeLabel = (type) => {
    const labels = {
      'apartment': 'Apartment',
      'independent-house': 'Independent House',
      'villa': 'Villa',
      'builder-floor': 'Builder Floor',
      'studio': 'Studio',
      'penthouse': 'Penthouse',
      'commercial': 'Commercial Space',
      'pg': 'PG'
    };
    return labels[type] || type;
  };

  const coverImage = images && images.length > 0 ? images[0] : DEFAULT_NO_IMAGE_URL;
  const topAmenities = amenities ? amenities.slice(0, 3) : [];

  return (
    <Link to={`/properties/${id}`} className="property-card">
      <div className="property-card__image-wrapper">
        <img 
          src={coverImage} 
          alt={`${getBhkLabel(bhk)} ${propertyType}`} 
          className="property-card__image"
        />
        <div className="property-card__badge">
          {propertyFor === 'rent' ? 'For Rent' : 'For Sale'}
        </div>
        {images && images.length > 1 && (
          <div className="property-card__image-count">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            {images.length}
          </div>
        )}
      </div>

      <div className="property-card__content">
        <div className="property-card__header">
          <h3 className="property-card__title">
            {getBhkLabel(bhk)} {getPropertyTypeLabel(propertyType)}
          </h3>
          <div className="property-card__price">
            {formatPrice(expectedPrice)}
            {propertyFor === 'rent' && <span className="price-period">/month</span>}
          </div>
        </div>

        <div className="property-card__location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {locality}, {city}
        </div>

        <div className="property-card__specs">
          <div className="spec-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            {builtUpArea} sq ft
          </div>
          <div className="spec-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 9v11a2 2 0 01-2 2H6a2 2 0 01-2-2V9"/>
              <path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/>
            </svg>
            {furnishing === 'fully-furnished' ? 'Fully Furnished' : 
             furnishing === 'semi-furnished' ? 'Semi Furnished' : 'Unfurnished'}
          </div>
        </div>

        {topAmenities.length > 0 && (
          <div className="property-card__amenities">
            {topAmenities.map((amenity, index) => (
              <span key={index} className="amenity-tag">
                {amenity.replace(/-/g, ' ')}
              </span>
            ))}
            {amenities.length > 3 && (
              <span className="amenity-tag amenity-tag--more">
                +{amenities.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default PropertyCard;