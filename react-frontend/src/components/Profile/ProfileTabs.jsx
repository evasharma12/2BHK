import React from 'react';
import './ProfileTabs.css';

const ProfileTabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="profile-tabs">
      <div className="profile-tabs__list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`profile-tabs__tab ${activeTab === tab.id ? 'profile-tabs__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="profile-tabs__icon">{tab.icon}</span>
            <span className="profile-tabs__label">{tab.label}</span>
            {tab.count !== null && tab.count !== undefined && (
              <span className="profile-tabs__count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
      <div className="profile-tabs__divider" />
    </div>
  );
};

export default ProfileTabs;