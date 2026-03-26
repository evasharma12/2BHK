import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PostProperty from '../components/PostProperty/PostProperty';
import { api } from '../utils/api';
import './EditPropertyPage.css';

const mapBackendToFormData = (p) => {
  if (!p) return null;
  return {
    propertyFor: p.property_for,
    propertyType: p.property_type,
    bhk: p.bhk_type,
    address: p.address_text || '',
    addressText: p.address_text || '',
    latitude: p.lat ?? '',
    longitude: p.lng ?? '',
    locationConfirmed: Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)),
    locality: p.locality || '',
    city: p.city || '',
    pincode: p.pincode || '',
    builtUpArea: p.built_up_area || '',
    carpetArea: p.carpet_area || '',
    totalFloors: p.total_floors || '',
    floorNumber: p.floor_number || '',
    propertyAge: p.property_age || '',
    furnishing: p.furnishing || '',
    facing: p.facing || '',
    expectedPrice: p.expected_price || '',
    priceNegotiable: !!p.price_negotiable,
    maintenanceCharges: p.maintenance_charges || '',
    securityDeposit: p.security_deposit || '',
    description: p.description || '',
    availableFrom: p.available_from || '',
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    images: (p.images || []).map((url) => ({ url, preview: url })),
  };
};

const EditPropertyPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = api.getUser();
    if (!user) {
      navigate(`/login?redirect=/properties/${id}/edit`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getProperty(id);
        const data = res.data;
        if (data.owner_id && data.owner_id !== user.user_id) {
          setError('You do not have permission to edit this property.');
          setInitialData(null);
          return;
        }
        if (!cancelled) setInitialData(mapBackendToFormData(data));
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load property');
          setInitialData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="post-property-page-wrapper">
        <div className="post-property-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading property...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="post-property-page-wrapper">
        <div className="post-property-container" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="post-property-error">{error || 'Property not found.'}</p>
          <button type="button" className="nav-btn nav-btn--primary" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-property-page-wrapper">
      <PostProperty propertyId={id} initialFormData={initialData} />
    </div>
  );
};

export default EditPropertyPage;
