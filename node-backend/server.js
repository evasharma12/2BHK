const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Import database connection
const { testConnection } = require('./storage/dbConnection');

// Import routes
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const userRoutes = require('./routes/user.routes');
const amenityRoutes = require('./routes/amenity.routes');

// Initialize Express app
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS: allow FRONTEND_URL(s) plus localhost so local dev and deployed frontend both work
const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = [...new Set([...frontendUrls, ...devOrigins])];
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Normalize trailing slashes (Express does not match /path and /path/ as the same)
app.use((req, res, next) => {
  if (req.path.endsWith('/') && req.path.length > 1) {
    const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
    req.url = req.path.slice(0, -1) + query;
  }
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check (root and /health for Railway and other platforms)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '2BHK API is running!',
    version: '1.0.0'
  });
});
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

// Serve uploaded property images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth request logging (debug)
app.use('/api/auth', (req, res, next) => {
  // #region agent log
  const payload = { sessionId: '2cbbff', location: 'server.js:auth', message: 'auth request', data: { method: req.method, path: req.path, origin: req.get('origin'), frontendUrl: process.env.FRONTEND_URL }, timestamp: Date.now(), hypothesisId: 'H1-H5' };
  fetch('http://127.0.0.1:7878/ingest/bdfa25f6-f50c-4998-8abf-1b01cf129e40', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2cbbff' }, body: JSON.stringify(payload) }).catch(() => {});
  // #endregion
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/amenities', amenityRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
  console.warn('404 Route not found:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    // Start server - bind to 0.0.0.0 so Railway/proxy can reach the app
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════╗
║   2BHK API Server                  ║
║   Status: Running ✓                    ║
║   Port: ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}        ║
║   Database: Connected ✓                ║
╚════════════════════════════════════════╝
      `);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;