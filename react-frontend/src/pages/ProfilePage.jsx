import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProfileHeader from '../components/Profile/ProfileHeader';
import ProfileTabs from '../components/Profile/ProfileTabs';
import SavedProperties, { MyListings } from '../components/Profile/SavedProperties';
import ChatList from '../components/Chat/ChatList';
import EditProfileModal from '../components/Profile/EditProfileModal';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import './ProfilePage.css';

const isOwnerType = (userType) => userType === 'owner' || userType === 'both';

const ProfilePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (!cancelled) {
            setUser(parsedUser);
            setActiveTab(isOwnerType(parsedUser.user_type) ? 'listings' : 'saved');
          }
        } catch (_) {}
      }

      try {
        const freshUser = await api.getCurrentUser();
        if (!cancelled) {
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
          setActiveTab((prev) => {
            if (isOwnerType(freshUser.user_type)) {
              return prev === 'saved' || prev === 'chats' || prev === 'listings'
                ? prev
                : 'listings';
            }
            return prev === 'saved' || prev === 'chats' ? prev : 'saved';
          });
        }
      } catch (err) {
        // Keep localStorage user as fallback if network refresh fails.
        console.warn('Failed to refresh profile from backend:', err?.message || err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setShowEditModal(false);
  };

  const handleLogout = () => {
    api.clearAuthData();
    navigate('/');
    showToast('Successfully logged out');
  };

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const loadUnreadChatCount = async () => {
      if (!user) {
        if (!cancelled) setUnreadChatCount(0);
        return;
      }

      try {
        const response = await api.getChatThreads();
        const threads = Array.isArray(response?.data) ? response.data : [];
        const unread = threads.reduce((sum, thread) => {
          const count = Number(thread?.unread_count);
          return sum + (Number.isFinite(count) ? count : 0);
        }, 0);
        if (!cancelled) setUnreadChatCount(unread);
      } catch (_) {
        if (!cancelled) setUnreadChatCount(0);
      }
    };

    loadUnreadChatCount();
    if (user) {
      intervalId = window.setInterval(loadUnreadChatCount, 30000);
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [user]);

  const getTabsForUserType = (userType) => {
    const chatsCount = unreadChatCount > 0 ? (unreadChatCount > 99 ? '99+' : unreadChatCount) : null;

    if (isOwnerType(userType)) {
      return [
        { id: 'listings',  label: 'Listed Properties', icon: '🏠', count: null },
        { id: 'chats', label: 'Chats', icon: '💬', count: chatsCount },
        { id: 'saved',     label: 'Saved Properties',  icon: '❤️', count: null },
      ];
    }
    // Renters/buyers: Saved Properties and Chats
    return [
      { id: 'saved', label: 'Saved Properties', icon: '❤️', count: null },
      { id: 'chats', label: 'Chats', icon: '💬', count: chatsCount },
    ];
  };

  useEffect(() => {
    if (!user) return;
    const requestedTab = new URLSearchParams(location.search).get('tab');
    if (!requestedTab) return;
    const tabs = getTabsForUserType(user.user_type).map((tab) => tab.id);
    if (tabs.includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [location.search, user]);

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
          onLogout={handleLogout}
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
            {activeTab === 'chats' && <ChatList userType={user.user_type} />}
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