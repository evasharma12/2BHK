import React from 'react';
import { Link } from 'react-router-dom';
import './SupportPage.css';

const CUSTOMER_CARE_EMAIL = 'codevaa6@gmail.com';

const CustomerCarePage = () => {
  return (
    <div className="support-page customer-care-page">
      <div className="support-page__container">
        <Link to="/" className="support-page__back">← Back to Home</Link>
        <h1 className="support-page__title">Customer Care</h1>
        <div className="support-page__content">
          <p>
            If you need help or have any queries related to the website, please email us at:
          </p>
          <p className="support-page__email">
            <a href={`mailto:${CUSTOMER_CARE_EMAIL}`} className="support-page__mailto">
              {CUSTOMER_CARE_EMAIL}
            </a>
          </p>
          <p className="support-page__hint">Click the email above to open your mail app and send us a message.</p>
          <a href={`mailto:${CUSTOMER_CARE_EMAIL}`} className="support-page__btn">
            Open mail app
          </a>
        </div>
      </div>
    </div>
  );
};

export default CustomerCarePage;
