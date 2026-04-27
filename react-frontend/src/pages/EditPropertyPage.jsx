import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { loginPathWithRedirect } from '../utils/authRedirect';
import PostProperty from '../components/PostProperty/PostProperty';
import { api } from '../utils/api';
import './EditPropertyPage.css';

const mapBackendToFormData = (p) => {
  if (!p) return null;
  const parsedTypeSpecificData = (() => {
    if (!p.type_specific_data) return {};
    if (typeof p.type_specific_data === 'object') return p.type_specific_data;
    try {
      return JSON.parse(p.type_specific_data);
    } catch (_) {
      return {};
    }
  })();
  const pgData = parsedTypeSpecificData?.pg || {};
  const normalizedRoomTypes = Array.isArray(pgData.room_types)
    ? pgData.room_types.map((roomType) => ({
        type: String(roomType?.type || ''),
        count: roomType?.count != null ? String(roomType.count) : '',
      }))
    : [{ type: '', count: '' }];
  const collapsedAddress = (() => {
    const text = String(p.address_text || '').trim().replace(/\s+/g, ' ');
    const repeatedPattern = /^(.*?),\s*\1$/;
    const match = text.match(repeatedPattern);
    return match ? match[1].trim() : text;
  })();
  const indiaMarker = ', India';
  const indiaIndex = collapsedAddress.indexOf(indiaMarker);
  const hasTrailingDetailsAfterMaps =
    indiaIndex !== -1 &&
    collapsedAddress
      .slice(indiaIndex + indiaMarker.length)
      .replace(/^[,\s]+/, '')
      .trim()
      .length > 0;
  const mapsAddressPart = hasTrailingDetailsAfterMaps
    ? collapsedAddress.slice(0, indiaIndex + indiaMarker.length).trim()
    : collapsedAddress;
  const addressTextPart = hasTrailingDetailsAfterMaps
    ? collapsedAddress.slice(indiaIndex + indiaMarker.length).replace(/^[,\s]+/, '').trim()
    : '';
  return {
    propertyFor: p.property_for,
    propertyType: p.property_type,
    bhk: p.bhk_type,
    address: mapsAddressPart,
    addressPlaceId:
      p.address_text && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
        ? '__existing__'
        : '',
    addressText: addressTextPart,
    latitude: p.lat ?? '',
    longitude: p.lng ?? '',
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
    ownershipMode: p.ownership_mode || 'registered_owner',
    ownerName: p.display_owner_name || p.owner_name || '',
    ownerPhoneNumber: p.display_owner_phone || p.owner_phone || '',
    secondaryPhoneNumber: p.secondary_phone_number || '',
    roomTypes: normalizedRoomTypes.length ? normalizedRoomTypes : [{ type: '', count: '' }],
    mealsAvailable:
      pgData.meals_available === true || pgData.meals_available === false
        ? pgData.meals_available
        : '',
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    images: (p.images || []).map((url) => ({ url, preview: url })),
  };
};

const EditPropertyPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = api.getUser();
    if (!user) {
      navigate(loginPathWithRedirect(location));
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
  }, [id, navigate, location]);

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
