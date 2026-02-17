import React from 'react';

const PropertyPricing = ({ formData, updateFormData }) => {
  const isRent = formData.propertyFor === 'rent';

  return (
    <div className="form-section">
      <div className="pricing-info">
        <p className="field-label">
          {isRent ? 'Rental' : 'Sale'} Pricing Details
        </p>
        <p className="field-hint">
          Set competitive pricing to attract genuine {isRent ? 'tenants' : 'buyers'}
        </p>
      </div>

      {/* Expected Price/Rent */}
      <div className="form-field form-field--full">
        <label htmlFor="expectedPrice" className="field-label">
          {isRent ? 'Expected Monthly Rent' : 'Expected Sale Price'}*
        </label>
        <div className="input-with-prefix">
          <span className="input-prefix">₹</span>
          <input
            type="number"
            id="expectedPrice"
            className="field-input field-input--with-prefix"
            placeholder={isRent ? "e.g., 25000" : "e.g., 5000000"}
            value={formData.expectedPrice}
            onChange={(e) => updateFormData('expectedPrice', e.target.value)}
            min="0"
            required
          />
        </div>
        {formData.expectedPrice && (
          <span className="price-words">
            {formatPriceInWords(formData.expectedPrice)}
            {isRent && ' per month'}
          </span>
        )}
      </div>

      {/* Price Negotiable */}
      <div className="form-field form-field--full">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.priceNegotiable}
            onChange={(e) => updateFormData('priceNegotiable', e.target.checked)}
            className="checkbox-input"
          />
          <span className="checkbox-text">Price is negotiable</span>
        </label>
      </div>

      {/* Maintenance Charges (for Rent) */}
      {isRent && (
        <div className="form-field">
          <label htmlFor="maintenanceCharges" className="field-label">
            Maintenance Charges (Optional)
          </label>
          <div className="input-with-prefix">
            <span className="input-prefix">₹</span>
            <input
              type="number"
              id="maintenanceCharges"
              className="field-input field-input--with-prefix"
              placeholder="e.g., 2000"
              value={formData.maintenanceCharges}
              onChange={(e) => updateFormData('maintenanceCharges', e.target.value)}
              min="0"
            />
          </div>
          <span className="field-hint">Monthly maintenance charges if applicable</span>
        </div>
      )}

      {/* Security Deposit (for Rent) */}
      {isRent && (
        <div className="form-field">
          <label htmlFor="securityDeposit" className="field-label">
            Security Deposit*
          </label>
          <div className="input-with-prefix">
            <span className="input-prefix">₹</span>
            <input
              type="number"
              id="securityDeposit"
              className="field-input field-input--with-prefix"
              placeholder="e.g., 50000"
              value={formData.securityDeposit}
              onChange={(e) => updateFormData('securityDeposit', e.target.value)}
              min="0"
              required={isRent}
            />
          </div>
          <span className="field-hint">Typically 2-3 months rent</span>
        </div>
      )}

      {/* Pricing Summary Card */}
      {formData.expectedPrice && (
        <div className="pricing-summary-card">
          <h4 className="summary-title">Pricing Summary</h4>
          <div className="summary-items">
            <div className="summary-item">
              <span className="summary-label">
                {isRent ? 'Monthly Rent' : 'Sale Price'}
              </span>
              <span className="summary-value">₹{parseInt(formData.expectedPrice).toLocaleString('en-IN')}</span>
            </div>
            
            {isRent && formData.maintenanceCharges && (
              <div className="summary-item">
                <span className="summary-label">Maintenance</span>
                <span className="summary-value">₹{parseInt(formData.maintenanceCharges).toLocaleString('en-IN')}</span>
              </div>
            )}
            
            {isRent && formData.securityDeposit && (
              <div className="summary-item">
                <span className="summary-label">Security Deposit</span>
                <span className="summary-value">₹{parseInt(formData.securityDeposit).toLocaleString('en-IN')}</span>
              </div>
            )}

            {isRent && (
              <>
                <div className="summary-divider"></div>
                <div className="summary-item summary-item--total">
                  <span className="summary-label">Move-in Cost</span>
                  <span className="summary-value">
                    ₹{(
                      parseInt(formData.expectedPrice || 0) +
                      parseInt(formData.maintenanceCharges || 0) +
                      parseInt(formData.securityDeposit || 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format price in words
const formatPriceInWords = (price) => {
  const num = parseInt(price);
  if (isNaN(num)) return '';
  
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Crore`;
  } else if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} Lakh`;
  } else if (num >= 1000) {
    return `₹${(num / 1000).toFixed(2)} Thousand`;
  }
  return `₹${num}`;
};

export default PropertyPricing;