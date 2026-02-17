const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const googleAuthService = require('../services/googleAuth');

class AuthController {
  
  // ============================================
  // GOOGLE SIGN-IN
  // POST /api/auth/google
  // ============================================
  
  static async googleSignIn(req, res) {
    try {
      const { token } = req.body;
      
      // Validation
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Google token is required'
        });
      }
      
      // Verify Google token and get user info
      const googleData = await googleAuthService.verifyGoogleToken(token);
      
      // Create or update user in database
      const userId = await User.createOrUpdateFromGoogle(googleData);
      
      // Get complete user data (including phone numbers if any)
      const user = await User.findByIdWithPhones(userId);
      
      // Update last login
      await User.updateLastLogin(userId);
      
      // Generate JWT token
      const jwtToken = jwt.sign(
        { 
          user_id: user.user_id ? user.user_id : user.google_id,
          email: user.email,
          user_type: user.user_type
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      res.json({
        success: true,
        message: 'Google sign-in successful',
        data: {
          user,
          token: jwtToken
        }
      });
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Google sign-in failed',
        error: error.message
      });
    }
  }
  
  // ============================================
  // SIGNUP
  // POST /api/auth/signup
  // ============================================
  
  static async signup(req, res) {
    try {
      const { username, email, password, user_type, full_name, phone_numbers } = req.body;
      
      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }
      
      // Check if email already exists
      const emailExists = await User.emailExists(email);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
      
      // Check if username already exists
      const usernameExists = await User.usernameExists(username);
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
      
      // Create user
      const userId = await User.create({
        username,
        email,
        password,
        user_type,
        full_name,
        phone_numbers
      });
      
      // Get created user (including phone numbers)
      const user = await User.findByIdWithPhones(userId);
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          user_id: user.user_id,
          email: user.email,
          user_type: user.user_type
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      // Remove password from response
      delete user.password_hash;
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user,
          token
        }
      });
      
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }
  }
  
  // ============================================
  // LOGIN
  // POST /api/auth/login
  // ============================================
  
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Check if account is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }
      
      // Verify password
      const isPasswordValid = await User.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Update last login
      await User.updateLastLogin(user.user_id);

      // Reload user with phone numbers
      const userWithPhones = await User.findByIdWithPhones(user.user_id);
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          user_id: user.user_id,
          email: user.email,
          user_type: user.user_type
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      // Remove password from response
      delete userWithPhones.password_hash;
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithPhones,
          token
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }
  
  // ============================================
  // GET CURRENT USER
  // GET /api/auth/me
  // ============================================
  
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.user_id;
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user
      });
      
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user data',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;