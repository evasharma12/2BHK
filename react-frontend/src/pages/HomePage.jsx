import React from 'react';
import { Link } from 'react-router-dom';
import PropertySearchForm from '../components/PropertySearchForm';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <PropertySearchForm />
      <footer className="home-footer">
        <div className="home-footer__inner">
          <div className="home-footer__column">
            <h4>About us</h4>
            <ul>
              <li><Link to="/">2BHK</Link></li>
              <li><span style={{ fontSize: '0.875rem', color: '#64748b' }}>Find your perfect home</span></li>
            </ul>
          </div>
          <div className="home-footer__column">
            <h4>Help</h4>
            <ul>
              <li><Link to="/terms">Terms & Conditions</Link></li>
              <li><Link to="/properties">Browse Properties</Link></li>
            </ul>
          </div>
          <div className="home-footer__column">
            <h4>Customer Care</h4>
            <ul>
              <li><Link to="/customer-care">Customer Care</Link></li>
            </ul>
          </div>
          <div className="home-footer__column">
            <h4>Feedback</h4>
            <ul>
              <li><Link to="/feedback">Send Feedback</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
