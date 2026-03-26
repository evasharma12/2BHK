import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import PropertyBasicInfo from './PropertyBasicInfo';
import PropertyDetails from './PropertyDetails';
import PropertyAmenities from './PropertyAmenities';
import PropertyImages from './PropertyImages';
import PropertyPricing from './PropertyPricing';
import OwnerContact from './OwnerContact';
import './PostProperty.css';

const defaultFormData = {
  propertyFor: 'rent',
  propertyType: '',
  bhk: '',
  address: '',
  addressPlaceId: '',
  addressText: '',
  latitude: '',
  longitude: '',
  locality: '',
  city: '',
  pincode: '',
  builtUpArea: '',
  carpetArea: '',
  totalFloors: '',
  floorNumber: '',
  propertyAge: '',
  furnishing: '',
  facing: '',
  amenities: [],
  expectedPrice: '',
  priceNegotiable: false,
  maintenanceCharges: '',
  securityDeposit: '',
  images: [],
  description: '',
  availableFrom: '',
};

const PostProperty = ({ propertyId = null, initialFormData = null }) => {
  const navigate = useNavigate();
  const isEditMode = Boolean(propertyId);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(() =>
    initialFormData ? { ...defaultFormData, ...initialFormData } : { ...defaultFormData }
  );

  const totalSteps = 6;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateMultipleFields = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const validateStepOne = () => {
    const requiredFields = [
      ['propertyType', 'Select a property type.'],
      ['bhk', 'Select a BHK type.'],
      ['address', 'Enter the property address.'],
      ['locality', 'Enter locality/area.'],
      ['city', 'Enter city.'],
      ['pincode', 'Enter a valid 6-digit pincode.'],
    ];

    for (const [field, message] of requiredFields) {
      if (!String(formData[field] || '').trim()) {
        setError(message);
        return false;
      }
    }

    if (!/^\d{6}$/.test(String(formData.pincode || '').trim())) {
      setError('Enter a valid 6-digit pincode.');
      return false;
    }

    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (!String(formData.addressPlaceId || '').trim()) {
      setError('Choose a valid property address from the dropdown suggestions.');
      return false;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Choose a valid property address from the dropdown to set coordinates.');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    setError('');
    if (currentStep === 1 && !validateStepOne()) return;
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const user = api.getUser();
      if (!user) {
        setError('Please log in to post a property.');
        setIsSubmitting(false);
        return;
      }

      let imageUrls = [];
      if (formData.images && formData.images.length > 0) {
        const existingUrls = formData.images.filter((img) => img.url).map((img) => img.url);
        const files = formData.images.map((img) => img.file).filter(Boolean);
        if (files.length > 0) {
          const uploadRes = await api.uploadPropertyImages(files);
          const newUrls = uploadRes.data?.urls || [];
          imageUrls = [...existingUrls, ...newUrls];
        } else {
          imageUrls = existingUrls;
        }
      }

      const payload = {
        property_for: formData.propertyFor,
        property_type: formData.propertyType,
        bhk_type: formData.bhk,
        address_text: String(formData.addressText || formData.address || '').trim() || null,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        locality: formData.locality,
        city: formData.city,
        state: '',
        pincode: formData.pincode,
        built_up_area: formData.builtUpArea,
        carpet_area: formData.carpetArea,
        total_floors: formData.totalFloors,
        floor_number: formData.floorNumber,
        property_age: formData.propertyAge,
        furnishing: formData.furnishing,
        facing: formData.facing,
        expected_price: formData.expectedPrice,
        price_negotiable: formData.priceNegotiable,
        maintenance_charges: formData.maintenanceCharges,
        security_deposit: formData.securityDeposit,
        description: formData.description,
        available_from: formData.availableFrom,
        amenities: formData.amenities || [],
        image_urls: imageUrls,
      };

      if (isEditMode) {
        await api.updateProperty(propertyId, payload);
        alert('Property updated successfully!');
        navigate(`/properties/${propertyId}`);
      } else {
        await api.createProperty(payload);
        alert('Property posted successfully!');
        navigate('/properties');
      }
    } catch (err) {
      console.error(isEditMode ? 'Error updating property:' : 'Error posting property:', err);
      setError(err.message || (isEditMode ? 'Failed to update property. Please try again.' : 'Failed to post property. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PropertyBasicInfo
            formData={formData}
            updateFormData={updateFormData}
            updateMultipleFields={updateMultipleFields}
            mapValidationError={
              error &&
              (error.includes('map') ||
                error.includes('coordinates') ||
                error.includes('location'))
                ? error
                : ''
            }
          />
        );
      case 2:
        return (
          <PropertyDetails
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 3:
        return (
          <PropertyAmenities
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 4:
        return (
          <PropertyImages
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 5:
        return (
          <PropertyPricing
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 6:
        return (
          <OwnerContact
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const titles = [
      'Basic Information',
      'Property Details',
      'Amenities',
      'Property Images',
      'Pricing & Charges',
      'Contact Information'
    ];
    return titles[currentStep - 1];
  };

  return (
    <div className="post-property-page">
      <div className="post-property-container">
        {/* Header */}
        <div className="post-property-header">
          <h1 className="post-property-title">{isEditMode ? 'Edit Property' : 'Post Your Property'}</h1>
          <p className="post-property-subtitle">
            {isEditMode
              ? 'Update the details of your property.'
              : `Fill in the details to list your property for ${formData.propertyFor === 'rent' ? 'rent' : 'sale'}`}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
            >
              <div className="progress-step-circle">
                {currentStep > step ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  step
                )}
              </div>
              {step < 6 && <div className="progress-step-line"></div>}
            </div>
          ))}
        </div>

        {/* Step Title */}
        <div className="step-title-section">
          <h2 className="step-title">{getStepTitle()}</h2>
          <p className="step-counter">Step {currentStep} of {totalSteps}</p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="post-property-form">
          <div className="form-step-content">
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          {error && (
            <div className="post-property-error">
              {error}
            </div>
          )}

          <div className="form-navigation">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="nav-btn nav-btn--secondary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Previous
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="nav-btn nav-btn--primary"
              >
                Next
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                className="nav-btn nav-btn--submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="nav-btn-spinner" />
                    {isEditMode ? 'Updating...' : 'Posting...'}
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {isEditMode ? 'Update Property' : 'Post Property'}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostProperty;