import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import '../Profile/ProfileTabContent.css';

const isOwnerType = (userType) => userType === 'owner' || userType === 'both';

const formatLastMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

const getPropertyContext = (thread) => {
  const bhk = thread?.bhk_type ? `${thread.bhk_type} BHK` : 'Property';
  const locality = thread?.locality || 'Unknown locality';
  const city = thread?.city || 'Unknown city';
  return `${bhk} · ${locality}, ${city}`;
};

const ChatList = ({ userType }) => {
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadThreads = async () => {
      setIsLoading(true);
      try {
        const response = await api.getChatThreads();
        if (!cancelled) {
          setThreads(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch chat threads:', error);
          setThreads([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadThreads();
    return () => {
      cancelled = true;
    };
  }, []);

  const title = useMemo(
    () => (isOwnerType(userType) ? 'Chats for Your Properties' : 'My Chats'),
    [userType]
  );

  if (isLoading) {
    return (
      <div className="tab-loader">
        {[1, 2, 3].map((key) => (
          <div key={key} className="tab-loader__card">
            <div className="tab-loader__lines">
              <div className="skeleton" style={{ height: 18, width: '55%' }} />
              <div className="skeleton" style={{ height: 14, width: '85%' }} />
              <div className="skeleton" style={{ height: 14, width: '35%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">💬</div>
        <h3 className="empty-state__title">
          {isOwnerType(userType) ? 'No chats yet for your properties' : 'No chats yet'}
        </h3>
        <p className="empty-state__subtitle">
          {isOwnerType(userType)
            ? 'When people contact you from a property page, those conversations will appear here.'
            : 'Start from any property detail page to begin chatting with the owner.'}
        </p>
        {!isOwnerType(userType) && (
          <a href="/properties" className="empty-state__btn">
            Browse Properties
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="tab-section">
      <div className="tab-section__header">
        <h2 className="tab-section__title">{title}</h2>
        <span className="tab-section__count">{threads.length} active</span>
      </div>

      <div className="chat-thread-list">
        {threads.map((thread) => (
          <div key={thread.thread_id} className="chat-thread-card">
            <div className="chat-thread-card__main">
              <div className="chat-thread-card__top">
                <span className="chat-thread-card__name">{thread.other_user_name || 'User'}</span>
                <span className="chat-thread-card__time">
                  {formatLastMessageTime(thread.last_message_at || thread.updated_at || thread.created_at)}
                </span>
              </div>

              <Link
                to={`/properties/${thread.property_id}`}
                className="chat-thread-card__property"
              >
                {getPropertyContext(thread)}
              </Link>

              <p className="chat-thread-card__message">
                {thread.last_message_text || 'No messages yet. Start the conversation.'}
              </p>
            </div>

            <div className="chat-thread-card__side">
              {Number(thread.unread_count) > 0 && (
                <span className="chat-thread-card__unread">{thread.unread_count}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
