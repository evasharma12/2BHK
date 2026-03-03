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
