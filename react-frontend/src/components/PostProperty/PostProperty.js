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

const PostProperty = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Basic Info
    propertyFor: 'rent',
    propertyType: '',
    bhk: '',
    
    // Location
    address: '',
    locality: '',
    city: '',
    pincode: '',
    
    // Details
    builtUpArea: '',
    carpetArea: '',
    totalFloors: '',
    floorNumber: '',
    propertyAge: '',
    furnishing: '',
    facing: '',
    
    // Amenities
    amenities: [],
    
    // Pricing
    expectedPrice: '',
    priceNegotiable: false,
    maintenanceCharges: '',
    securityDeposit: '',
    
    // Images
    images: [],
    
    // Description
    description: '',
    
    // Availability (owner contact comes from profile)
    availableFrom: ''
  });

  const totalSteps = 6;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateMultipleFields = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
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
        const files = formData.images.map((img) => img.file).filter(Boolean);
        if (files.length > 0) {
          const uploadRes = await api.uploadPropertyImages(files);
          imageUrls = uploadRes.data?.urls || [];
        }
      }

      const payload = {
        property_for: formData.propertyFor,
        property_type: formData.propertyType,
        bhk_type: formData.bhk,
        address: formData.address,
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

      await api.createProperty(payload);

      alert('Property posted successfully!');
      navigate('/properties');
    } catch (err) {
      console.error('Error posting property:', err);
      setError(err.message || 'Failed to post property. Please try again.');
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
          <h1 className="post-property-title">Post Your Property</h1>
          <p className="post-property-subtitle">
            Fill in the details to list your property for {formData.propertyFor === 'rent' ? 'rent' : 'sale'}
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
                    Posting...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Post Property
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