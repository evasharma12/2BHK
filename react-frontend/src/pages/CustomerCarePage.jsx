import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import './SupportPage.css';

const CustomerCarePage = () => {
  const [queryText, setQueryText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = String(queryText || '').trim();
    if (!text) {
      setSubmitError('Please enter your query.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await api.submitSupportQuery(text);
      setSubmitSuccess(true);
      setQueryText('');
    } catch (error) {
      setSubmitError(error?.message || 'Failed to submit your query. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="support-page customer-care-page">
      <div className="support-page__container">
        <Link to="/" className="support-page__back">← Back to Home</Link>
        <h1 className="support-page__title">Customer Care</h1>
        <div className="support-page__content">
          <p>If you need help, please submit your query here and our team will reach out.</p>

          <form className="support-query-form" onSubmit={handleSubmit}>
            <label htmlFor="supportQueryText" className="support-query-form__label">
              Your Query
            </label>
            <textarea
              id="supportQueryText"
              className="support-query-form__textarea"
              placeholder="Type your issue or question..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              maxLength={2000}
              rows={6}
            />
            <div className="support-query-form__footer">
              <span className="support-query-form__count">{queryText.length}/2000</span>
              <button type="submit" className="support-page__btn" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Query'}
              </button>
            </div>
          </form>

          {submitSuccess && (
            <p className="support-query-form__success">
              Thanks for reaching out to us! We will get back to you soon.
            </p>
          )}
          {submitError && <p className="support-query-form__error">{submitError}</p>}
        </div>
      </div>
    </div>
  );
};

export default CustomerCarePage;
