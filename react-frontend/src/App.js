import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PostPropertyPage from './pages/PostPropertyPage';
import PropertiesListPage from './pages/PropertiesListPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import EditPropertyPage from './pages/EditPropertyPage';
import ProfilePage from './pages/ProfilePage';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_AUTH_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage defaultMode="login" />} />
            <Route path="/signup" element={<LoginPage defaultMode="signup" />} />
            <Route path="/post-property" element={<PostPropertyPage />} />
            <Route path="/properties" element={<PropertiesListPage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/properties/:id/edit" element={<EditPropertyPage />} />
          </Routes>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;