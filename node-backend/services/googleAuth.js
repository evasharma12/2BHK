const { OAuth2Client } = require('google-auth-library');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(process.env.GOOGLE_AUTH_CLIENT_ID);
  }

  /**
   * Verify Google ID token and extract user information
   * @param {string} token - Google ID token from frontend
   * @returns {Object} User information from Google
   */
  async verifyGoogleToken(token) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_AUTH_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      // Extract user information
      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified,
        name: payload.name,
        picture: payload.picture,
        givenName: payload.given_name,
        familyName: payload.family_name
      };
      
    } catch (error) {
      console.error('Error verifying Google token:', error);
      throw new Error('Invalid Google token');
    }
  }
}

module.exports = new GoogleAuthService();