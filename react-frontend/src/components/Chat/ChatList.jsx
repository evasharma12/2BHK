import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const selectedThread = useMemo(
    () => threads.find((t) => Number(t.thread_id) === Number(selectedThreadId)) || null,
    [threads, selectedThreadId]
  );

  const loadThreads = async () => {
    try {
      const response = await api.getChatThreads();
      const list = Array.isArray(response?.data) ? response.data : [];
      setThreads(list);
      return list;
    } catch (error) {
      console.error('Failed to fetch chat threads:', error);
      setThreads([]);
      return [];
    }
  };

  const loadMessages = async (threadId) => {
    if (!threadId) return;
    setMessagesLoading(true);
    setChatError('');
    try {
      const response = await api.getChatThreadMessages(threadId, { limit: 50 });
      setMessages(Array.isArray(response?.data) ? response.data : []);
      await api.markChatThreadRead(threadId);
      setThreads((prev) =>
        prev.map((thread) =>
          Number(thread.thread_id) === Number(threadId)
            ? { ...thread, unread_count: 0 }
            : thread
        )
      );
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
      setMessages([]);
      setChatError(error?.message || 'Failed to load messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const initialThreadId = Number(location?.state?.selectedThreadId) || null;
    const bootstrap = async () => {
      setIsLoading(true);
      const list = await loadThreads();
      if (cancelled) return;
      const firstThreadId = list.length > 0 ? list[0].thread_id : null;
      const pickThreadId = initialThreadId || firstThreadId || null;
      setSelectedThreadId(pickThreadId);
      setIsLoading(false);
      if (pickThreadId) {
        loadMessages(pickThreadId);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
    // include state so "Start Chat" can pre-select a thread
  }, [location?.state?.selectedThreadId]);

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

      <div className="chat-layout">
        <div className="chat-thread-list">
          {threads.map((thread) => (
            <button
              key={thread.thread_id}
              type="button"
              className="chat-thread-card"
              style={{
                width: '100%',
                textAlign: 'left',
                border:
                  Number(thread.thread_id) === Number(selectedThreadId)
                    ? '1px solid #3b82f6'
                    : '1px solid transparent',
              }}
              onClick={() => {
                setSelectedThreadId(thread.thread_id);
                loadMessages(thread.thread_id);
              }}
            >
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
                  onClick={(e) => e.stopPropagation()}
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
            </button>
          ))}
        </div>

        <div className="chat-conversation-panel">
          {selectedThread ? (
            <>
              <div className="chat-conversation-header">
                <div className="chat-conversation-name">{selectedThread.other_user_name || 'User'}</div>
                <Link to={`/properties/${selectedThread.property_id}`} className="chat-thread-card__property">
                  {getPropertyContext(selectedThread)}
                </Link>
              </div>

              <div className="chat-messages">
                {messagesLoading ? (
                  <p className="chat-hint-text">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="chat-hint-text">No messages yet. Start the conversation.</p>
                ) : (
                  messages.map((message) => {
                    const currentUser = api.getUser();
                    const mine = Number(message.sender_user_id) === Number(currentUser?.user_id);
                    return (
                      <div
                        key={message.message_id}
                        className={`chat-message-row ${mine ? 'chat-message-row--mine' : ''}`}
                      >
                        <div className={`chat-message-bubble ${mine ? 'chat-message-bubble--mine' : ''}`}>
                          <div className="chat-message-text">{message.message_text}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedThreadId || !composerText.trim() || sending) return;
                  setSending(true);
                  setChatError('');
                  try {
                    await api.sendChatMessage(selectedThreadId, composerText.trim(), 'text');
                    setComposerText('');
                    await Promise.all([loadMessages(selectedThreadId), loadThreads()]);
                  } catch (error) {
                    setChatError(error?.message || 'Failed to send message.');
                  } finally {
                    setSending(false);
                  }
                }}
                className="chat-composer"
              >
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  className="chat-composer-input"
                />
                <button
                  type="submit"
                  disabled={sending || !composerText.trim()}
                  className="chat-composer-send"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
              {chatError && <p className="chat-error-text">{chatError}</p>}
            </>
          ) : (
            <div className="chat-hint-text chat-hint-text--panel">Select a chat to start messaging.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatList;
