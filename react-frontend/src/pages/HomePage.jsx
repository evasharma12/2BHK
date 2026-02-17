import React from 'react';
import PropertySearchForm from '../components/PropertySearchForm';

const HomePage = () => {
  return (
    <div className="home-page">
      <PropertySearchForm />
      {/* You can add more sections here like:
          - Featured Properties
          - How It Works
          - Testimonials
          - Footer
      */}
    </div>
  );
};

export default HomePage;