// API utility for backend communication
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function handleFetchError(err, context) {
  if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
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
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Signup failed');
    }
    return data;
  },

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  },

  async googleAuth(token) {
    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
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
