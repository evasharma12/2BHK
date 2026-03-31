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
      const netCode = error?.code || error?.cause?.code || error?.error?.code;
      const isNetwork =
        ['ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN'].includes(netCode) ||
        String(error?.message || '').includes('Failed to retrieve verification certificates');
      if (isNetwork) {
        throw new Error(
          'Cannot reach Google to verify sign-in (network timeout). If the API runs in a VPC (e.g. App Runner connector), ' +
            'ensure private subnets route 0.0.0.0/0 to a NAT Gateway so outbound HTTPS to www.googleapis.com works.'
        );
      }
      throw new Error('Invalid Google token');
    }
  }
}

module.exports = new GoogleAuthService();