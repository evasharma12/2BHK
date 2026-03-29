import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { loginPathWithRedirect } from '../utils/authRedirect';
import './SupportPage.css';

const FeedbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = String(feedbackText || '').trim();
    if (!text) {
      setSubmitError('Please enter your feedback.');
      return;
    }

    if (!api.getAuthToken() || !api.getUser()) {
      navigate(loginPathWithRedirect(location));
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await api.submitFeedback(text);
      setSubmitSuccess(true);
      setFeedbackText('');
    } catch (error) {
      setSubmitError(error?.message || 'Failed to submit your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="support-page feedback-page">
      <div className="support-page__container">
        <Link to="/" className="support-page__back">← Back to Home</Link>
        <h1 className="support-page__title">Feedback</h1>
        <div className="support-page__content">
          <p>We would love your feedback. Please share your thoughts below.</p>

          <form className="support-query-form" onSubmit={handleSubmit}>
            <label htmlFor="feedbackText" className="support-query-form__label">
              Your Feedback
            </label>
            <textarea
              id="feedbackText"
              className="support-query-form__textarea"
              placeholder="Share what you liked, what can be improved, or any suggestions..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              maxLength={2000}
              rows={6}
            />
            <div className="support-query-form__footer">
              <span className="support-query-form__count">{feedbackText.length}/2000</span>
              <button type="submit" className="support-page__btn" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>

          {submitSuccess && (
            <p className="support-query-form__success">
              Thanks for sharing your feedback! We really appreciate it.
            </p>
          )}
          {submitError && <p className="support-query-form__error">{submitError}</p>}
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
