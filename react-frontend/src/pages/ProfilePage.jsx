import React, { useState, useEffect } from 'react';
import ProfileHeader from '../components/Profile/ProfileHeader';
import ProfileTabs from '../components/Profile/ProfileTabs';
import SavedProperties, { MyListings, MyInquiries } from '../components/Profile/SavedProperties';
import EditProfileModal from '../components/Profile/EditProfileModal';
import './ProfilePage.css';

const isOwnerType = (userType) => userType === 'owner' || userType === 'both';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setActiveTab(isOwnerType(parsedUser.user_type) ? 'listings' : 'saved');
    }
    setIsLoading(false);
  }, []);

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setShowEditModal(false);
  };

  const getTabsForUserType = (userType) => {
    if (isOwnerType(userType)) {
      return [
        { id: 'listings',  label: 'Listed Properties', icon: '🏠', count: null },
        { id: 'inquiries', label: 'Inquiries',         icon: '📬', count: null },
        { id: 'saved',     label: 'Saved Properties',  icon: '❤️', count: null },
      ];
    }
    // Renters/buyers: Saved Properties and My Inquiries
    return [
      { id: 'saved',     label: 'Saved Properties', icon: '❤️', count: null },
      { id: 'inquiries', label: 'My Inquiries',      icon: '📬', count: null },
    ];
  };

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="profile-loading__spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-gate">
        <div className="profile-gate__icon">🔒</div>
        <h2>Please log in to view your profile</h2>
        <a href="/login" className="profile-gate__btn">Sign In</a>
      </div>
    );
  }

  const tabs = getTabsForUserType(user.user_type);

  return (
    <div className="profile-page">
      <div className="profile-page__inner">

        <ProfileHeader
          user={user}
          onEditClick={() => setShowEditModal(true)}
        />

        <div className="profile-page__body">
          <ProfileTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="profile-page__content">
            {activeTab === 'saved'     && <SavedProperties   userId={user.user_id} />}
            {activeTab === 'listings'  && <MyListings        userId={user.user_id} />}
            {activeTab === 'inquiries' && <MyInquiries       userId={user.user_id} userType={user.user_type} />}
          </div>
        </div>

      </div>

      {showEditModal && (
        <EditProfileModal
          user={user}
          onSave={handleProfileUpdate}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default ProfilePage;