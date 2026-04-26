// API utility for backend communication (strip trailing slashes to avoid double-slash URLs)
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

if (API_BASE_URL && !API_BASE_URL.startsWith('http://') && !API_BASE_URL.startsWith('https://')) {
  console.warn(
    'REACT_APP_API_URL should be a full URL (e.g. https://your-api.railway.app). Missing https:// causes requests to hit the wrong server.'
  );
}

function handleFetchError(err, context) {
  if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
    return new Error(
      `Cannot reach the server at ${API_BASE_URL}. Make sure the backend is running (e.g. \`npm run dev\` in node-backend) and the URL is correct.`
    );
  }
  return err;
}

function normalizeMapServiceError(err, fallbackMessage) {
  const message = String(err?.message || '');
  if (message.includes('Google Maps API key is not configured')) {
    return new Error(
      'Location suggestions are temporarily unavailable because map services are not configured. You can continue by typing location text manually.'
    );
  }
  if (message.includes('OVER_QUERY_LIMIT')) {
    return new Error('Location suggestions are currently rate limited. Please try again in a moment.');
  }
  return new Error(fallbackMessage);
}

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Invalid response from server. Check the backend is running and returns JSON.');
  }
}

export const api = {
  // Auth endpoints
  async signup(userData) {
    let response;
    const signupUrl = `${API_BASE_URL}/api/auth/signup`;
    try {
      response = await fetch(signupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
    } catch (err) {
      throw handleFetchError(err, 'signup');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Signup failed');
    }
    return data;
  },

  async login(email, password) {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (err) {
      throw handleFetchError(err, 'login');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  },

  async googleAuth(token) {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      throw handleFetchError(err, 'Google auth');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      // Log so you can see the real error in browser DevTools → Console
      console.error('Google auth failed:', response.status, data);
      throw new Error(data.message || 'Google authentication failed');
    }
    return data;
  },

  async getCurrentUser() {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      throw handleFetchError(err, 'get current user');
    }

    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch user');
    }
    return data.data;
  },

  // Property endpoints
  async createProperty(propertyData) {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(propertyData),
      });
    } catch (err) {
      throw handleFetchError(err, 'create property');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create property');
    }
    return data;
  },

  async createPhantomProperty(propertyData) {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/properties/admin/phantom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(propertyData),
      });
    } catch (err) {
      throw handleFetchError(err, 'create phantom property');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create phantom property');
    }
    return data;
  },

  async getProperties(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== '' && value !== 'all') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    const url = query ? `${API_BASE_URL}/api/properties?${query}` : `${API_BASE_URL}/api/properties`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch properties');
    }
    return data;
  },

  async getProperty(id) {
    const response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Property not found');
    }
    return data;
  },

  async updateProperty(id, propertyData) {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(propertyData),
      });
    } catch (err) {
      throw handleFetchError(err, 'update property');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update property');
    }
    return data;
  },

  async getMyListings() {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/properties/my-listings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch your listings');
    }
    return data;
  },

  async checkSavedProperty(userId, propertyId) {
    const token = this.getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/api/users/${userId}/saved-properties/check/${propertyId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (!response.ok || !data.success) return { saved: false };
    return data.data;
  },

  async saveProperty(userId, propertyId) {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/saved-properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ property_id: propertyId }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to save property');
    }
    return data;
  },

  async unsaveProperty(userId, propertyId) {
    const token = this.getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/api/users/${userId}/saved-properties/${propertyId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to remove saved property');
    }
    return data;
  },

  async getPhoneVerificationStatus(userId, phoneNumber) {
    const token = this.getAuthToken();
    const qs = new URLSearchParams({ phone_number: phoneNumber || '' });
    let response;
    try {
      response = await fetch(
        `${API_BASE_URL}/api/users/${userId}/phone/verification-status?${qs.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      throw handleFetchError(err, 'phone verification status');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to check phone verification status');
    }
    return data.data;
  },

  async verifyPhoneOtp(userId, phoneNumber, firebaseIdToken) {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/users/${userId}/phone/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          firebase_id_token: firebaseIdToken,
        }),
      });
    } catch (err) {
      throw handleFetchError(err, 'phone otp verification');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to verify phone number');
    }
    return data.data;
  },

  async uploadPropertyImages(files) {
    const token = this.getAuthToken();
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/properties/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    } catch (err) {
      throw handleFetchError(err, 'upload images');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to upload images');
    }
    return data;
  },

  async getAddressSuggestions(input) {
    const query = String(input || '').trim();
    if (!query || query.length < 3) return [];

    let response;
    try {
      response = await fetch(
        `${API_BASE_URL}/api/maps/autocomplete?input=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (err) {
      throw normalizeMapServiceError(
        handleFetchError(err, 'address autocomplete'),
        'Unable to load location suggestions right now. You can still search using manual location text.'
      );
    }

    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw normalizeMapServiceError(
        new Error(data.message || 'Failed to fetch address suggestions'),
        'Unable to load location suggestions right now. You can still search using manual location text.'
      );
    }
    return data.data?.predictions || [];
  },

  async geocodeAddress(params = {}) {
    const placeId = params.placeId ? String(params.placeId).trim() : '';
    const address = params.address ? String(params.address).trim() : '';

    const search = new URLSearchParams();
    if (placeId) search.set('place_id', placeId);
    if (address) search.set('address', address);
    if (!placeId && !address) {
      throw new Error('Either placeId or address is required');
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/maps/geocode?${search.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      throw normalizeMapServiceError(
        handleFetchError(err, 'address geocode'),
        'Unable to pinpoint map coordinates right now. Search will continue using location text.'
      );
    }

    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw normalizeMapServiceError(
        new Error(data.message || 'Failed to geocode address'),
        'Unable to pinpoint map coordinates right now. Search will continue using location text.'
      );
    }
    return data.data;
  },

  // Chat endpoints
  async createOrGetChatThread(propertyId) {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/chats/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          property_id: propertyId,
        }),
      });
    } catch (err) {
      throw handleFetchError(err, 'create or get chat thread');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create or get chat thread');
    }
    return data;
  },

  async getChatThreads() {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/chats/threads`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      throw handleFetchError(err, 'get chat threads');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch chat threads');
    }
    return data;
  },

  async getChatThreadMessages(threadId, options = {}) {
    const token = this.getAuthToken();
    const search = new URLSearchParams();
    if (options.before != null && options.before !== '') {
      search.set('before', String(options.before));
    }
    if (options.limit != null && options.limit !== '') {
      search.set('limit', String(options.limit));
    }

    const query = search.toString();
    const url = query
      ? `${API_BASE_URL}/api/chats/threads/${threadId}/messages?${query}`
      : `${API_BASE_URL}/api/chats/threads/${threadId}/messages`;

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      throw handleFetchError(err, 'get chat thread messages');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch chat messages');
    }
    return data;
  },

  async sendChatMessage(threadId, messageText, messageType = 'text') {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/chats/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message_text: messageText,
          message_type: messageType,
        }),
      });
    } catch (err) {
      throw handleFetchError(err, 'send chat message');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to send chat message');
    }
    return data;
  },

  async markChatThreadRead(threadId) {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/chats/threads/${threadId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      throw handleFetchError(err, 'mark chat thread read');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to mark chat thread as read');
    }
    return data;
  },

  async submitSupportQuery(queryText) {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/support/queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query_text: queryText,
        }),
      });
    } catch (err) {
      throw handleFetchError(err, 'submit support query');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to submit support query');
    }
    return data;
  },

  async submitFeedback(feedbackText) {
    const token = this.getAuthToken();
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/feedback/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          feedback_text: feedbackText,
        }),
      });
    } catch (err) {
      throw handleFetchError(err, 'submit feedback');
    }
    const data = await parseJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to submit feedback');
    }
    return data;
  },

  // Helper to get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('token');
  },

  // Helper to get user from localStorage
  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Helper to save auth data
  saveAuthData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Helper to clear auth data
  clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('2bhk-auth-changed'));
    }
  },

  // Helper to check if user is authenticated
  isAuthenticated() {
    return !!this.getAuthToken();
  },
};
