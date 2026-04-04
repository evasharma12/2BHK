import React from 'react';
import { Link } from 'react-router-dom';
import './TermsPage.css';

const TermsPage = () => {
  return (
    <div className="terms-page">
      <div className="terms-container">
        <Link to="/" className="terms-back">
          ← Back to PropertyBazaar
        </Link>

        <header className="terms-header">
          <h1 className="terms-title">Terms and Conditions</h1>
          <p className="terms-updated">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </header>

        <div className="terms-content">
          <p className="terms-intro">
            Welcome to PropertyBazaar. By using this platform to browse, list, or inquire about properties, you agree to the following terms. Please read them carefully.
          </p>

          <section className="terms-section-block">
            <h2>1. Nature of the Platform</h2>
            <p>
              PropertyBazaar is a listing and discovery platform that connects property owners with potential buyers and tenants. The platform does not own, sell, or rent properties. We do not act as agents, brokers, or intermediaries in any transaction between users.
            </p>
          </section>

          <section className="terms-section-block">
            <h2>2. Responsibility of Property Owners and Listers</h2>
            <p>
              <strong>You take full responsibility</strong> that any property you post on the platform is valid, accurate, and that you are authorised to list it. You represent that the details you provide (including address, price, availability, images, and description) are true and not misleading. Listing a property that you are not authorised to list, or providing false or misleading information, may result in removal of the listing and suspension of your account.
            </p>
          </section>

          <section className="terms-section-block">
            <h2>3. Responsibility of Users (Buyers, Tenants, and Visitors)</h2>
            <p>
              <strong>All users are solely responsible</strong> for verifying any and all information they see on the platform or receive from other users. This includes but is not limited to: property details, pricing, availability, ownership, legal title, documents, and the identity or credentials of other users. You must conduct your own due diligence before entering into any transaction, agreement, or payment. The platform does not guarantee the accuracy, completeness, or legality of any listing or user-generated content.
            </p>
          </section>

          <section className="terms-section-block">
            <h2>4. No Verification by the Platform</h2>
            <p>
              <strong>The website is not responsible for verifying</strong> any information shared by users. We do not verify the identity of listers or visitors, the ownership or legal status of properties, the accuracy of listings, or the authenticity of documents or communications. All content on the platform is provided by users “as is.” You use the platform and rely on any information at your own risk.
            </p>
          </section>

          <section className="terms-section-block">
            <h2>5. Contact and Verification</h2>
            <p>
              Users must <strong>contact property owners or listers directly</strong> for any inquiries, negotiations, or transactions. You are responsible for verifying details with the other party before making any commitment or payment. The platform does not participate in, and is not responsible for, any agreement or transaction between users. We recommend meeting in person where possible and verifying documents and identity through your own means.
            </p>
          </section>

          <section className="terms-section-block">
            <h2>6. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, PropertyBazaar and its operators shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from: (a) your use or inability to use the platform; (b) any listing, communication, or transaction between users; (c) any inaccuracy, omission, or fraud in user-generated content; (d) any dispute, loss, or harm resulting from interactions with other users. Your use of the platform is at your sole risk.
            </p>
          </section>

          <section className="terms-section-block">
            <h2>7. Prohibited Conduct</h2>
            <p>
              You must not use the platform to post false, misleading, or illegal content; to impersonate others; to harass or defraud users; or to violate any applicable law. We reserve the right to remove content and suspend or terminate accounts that breach these terms.
            </p>
          </section>

          <section className="terms-section-block">
            <h2>8. Changes to These Terms</h2>
            <p>
              We may update these Terms and Conditions from time to time. The updated version will be posted on this page with a revised “Last updated” date. Continued use of the platform after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="terms-section-block">
            <h2>9. Contact</h2>
            <p>
              For questions about these Terms and Conditions, please contact us through the contact details provided on the platform.
            </p>
          </section>

          <div className="terms-footer-actions">
            <Link to="/post-property" className="terms-cta">
              Back to Post Property
            </Link>
            <Link to="/" className="terms-cta terms-cta--secondary">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
