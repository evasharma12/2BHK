// API utility for backend communication (strip trailing slashes to avoid double-slash URLs)
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

if (API_BASE_URL && !API_BASE_URL.startsWith('http://') && !API_BASE_URL.startsWith('https://')) {
  console.warn(
    'REACT_APP_API_URL should be a full URL (e.g. https://your-api.railway.app). Missing https:// causes requests to hit the wrong server.'
  );
}

function handleFetchError(err, context) {
  if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
    // #region agent log
    try {
      fetch('http://127.0.0.1:7878/ingest/bdfa25f6-f50c-4998-8abf-1b01cf129e40', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '2cbbff',
        },
        body: JSON.stringify({
          sessionId: '2cbbff',
          runId: 'initial-login-debug',
          hypothesisId: 'H1-H4',
          location: 'api.js:handleFetchError',
          message: 'fetch failed - backend not reachable',
          data: {
            context,
            errName: err?.name,
            errMessage: err?.message,
            apiBase: API_BASE_URL,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
            href: typeof window !== 'undefined' ? window.location.href : '',
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch (_) {}
    // #endregion
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
    // #region agent log
    try {
      fetch('http://127.0.0.1:7878/ingest/bdfa25f6-f50c-4998-8abf-1b01cf129e40',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cbbff'},body:JSON.stringify({sessionId:'2cbbff',location:'api.js:signup',message:'signup attempt',data:{url:signupUrl,apiBase:API_BASE_URL,hasDoubleSlash:signupUrl.includes('//'),origin:typeof window!=='undefined'?window.location.origin:''},timestamp:Date.now(),hypothesisId:'H1-H3'})}).catch(()=>{});
    } catch (_) {}
    // #endregion
    try {
      response = await fetch(signupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      // #region agent log
      try {
        fetch('http://127.0.0.1:7878/ingest/bdfa25f6-f50c-4998-8abf-1b01cf129e40',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cbbff'},body:JSON.stringify({sessionId:'2cbbff',location:'api.js:signup response',message:'signup got response',data:{ok:response?.ok,status:response?.status,url:response?.url},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      } catch (_) {}
      // #endregion
    } catch (err) {
      // #region agent log
      try {
        fetch('http://127.0.0.1:7878/ingest/bdfa25f6-f50c-4998-8abf-1b01cf129e40',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cbbff'},body:JSON.stringify({sessionId:'2cbbff',location:'api.js:signup catch',message:'signup fetch threw',data:{errName:err?.name,errMessage:err?.message,apiBase:API_BASE_URL},timestamp:Date.now(),hypothesisId:'H1-H4'})}).catch(()=>{});
      } catch (_) {}
      // #endregion
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
  },

  // Helper to check if user is authenticated
  isAuthenticated() {
    return !!this.getAuthToken();
  },
};
