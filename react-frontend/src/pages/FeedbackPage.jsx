import React from 'react';
import { Link } from 'react-router-dom';
import './SupportPage.css';

const FEEDBACK_EMAIL = 'codevaa@gmail.com';

const FeedbackPage = () => {
  return (
    <div className="support-page feedback-page">
      <div className="support-page__container">
        <Link to="/" className="support-page__back">← Back to Home</Link>
        <h1 className="support-page__title">Feedback</h1>
        <div className="support-page__content">
          <p>
            We would highly appreciate if you could give us your feedback on:
          </p>
          <p className="support-page__email">
            <a href={`mailto:${FEEDBACK_EMAIL}`} className="support-page__mailto">
              {FEEDBACK_EMAIL}
            </a>
          </p>
          <p className="support-page__hint">Click the email above or the button below to open your mail app.</p>
          <a href={`mailto:${FEEDBACK_EMAIL}`} className="support-page__btn">
            Open mail app
          </a>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
