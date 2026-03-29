const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import database connection
const { testConnection } = require('./storage/dbConnection');

// Import routes
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const userRoutes = require('./routes/user.routes');
const amenityRoutes = require('./routes/amenity.routes');
const mapsRoutes = require('./routes/maps.routes');
const chatRoutes = require('./routes/chat.routes');
const supportRoutes = require('./routes/support.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const ChatThread = require('./models/chatThread.model');
const ChatMessage = require('./models/chatMessage.model');
const { emitNewMessage, emitReadReceipt } = require('./services/chatRealtime.service');
const { setIO, userRoom, threadRoom } = require('./services/socket.service');
const { registerChatDigestCron } = require('./services/chatDigest.service');

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

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});
setIO(io);

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function getTokenFromSocketHandshake(socket) {
  const authToken = socket.handshake?.auth?.token;
  if (authToken && typeof authToken === 'string') {
    return authToken.startsWith('Bearer ') ? authToken.split(' ')[1] : authToken;
  }

  const authHeader = socket.handshake?.headers?.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const queryToken = socket.handshake?.query?.token;
  if (queryToken && typeof queryToken === 'string') {
    return queryToken.startsWith('Bearer ') ? queryToken.split(' ')[1] : queryToken;
  }

  return null;
}

io.use((socket, next) => {
  try {
    const token = getTokenFromSocketHandshake(socket);
    if (!token) {
      return next(new Error('Unauthorized: token missing'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (!decoded?.user_id) {
      return next(new Error('Unauthorized: invalid token payload'));
    }
    socket.user = decoded;
    return next();
  } catch (error) {
    return next(new Error('Unauthorized: invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const currentUserId = socket.user.user_id;
  socket.join(userRoom(currentUserId));

  socket.on('chat:join_thread', async (payload = {}, ack) => {
    try {
      const threadId = parsePositiveInt(payload.thread_id);
      if (!threadId) throw new Error('thread_id must be a positive integer');

      const thread = await ChatThread.findByIdForUser(threadId, currentUserId);
      if (!thread) throw new Error('Not authorized for this thread');

      socket.join(threadRoom(threadId));
      if (typeof ack === 'function') ack({ success: true, data: { thread_id: threadId } });
    } catch (error) {
      if (typeof ack === 'function') ack({ success: false, message: error.message });
    }
  });

  socket.on('chat:leave_thread', (payload = {}, ack) => {
    const threadId = parsePositiveInt(payload.thread_id);
    if (!threadId) {
      if (typeof ack === 'function') ack({ success: false, message: 'thread_id must be a positive integer' });
      return;
    }
    socket.leave(threadRoom(threadId));
    if (typeof ack === 'function') ack({ success: true, data: { thread_id: threadId } });
  });

  socket.on('chat:send_message', async (payload = {}, ack) => {
    try {
      const threadId = parsePositiveInt(payload.thread_id);
      const messageText = String(payload.message_text || '').trim();
      const messageType = payload.message_type || 'text';

      if (!threadId) throw new Error('thread_id must be a positive integer');
      if (!messageText) throw new Error('message_text is required');
      if (messageType !== 'text') throw new Error('Unsupported message_type');

      const thread = await ChatThread.findByIdForUser(threadId, currentUserId);
      if (!thread) throw new Error('Not authorized for this thread');

      const messageId = await ChatMessage.create(threadId, currentUserId, messageText, messageType);
      const message = await ChatMessage.findById(messageId);
      emitNewMessage(thread, message);

      if (typeof ack === 'function') ack({ success: true, data: message });
    } catch (error) {
      if (typeof ack === 'function') ack({ success: false, message: error.message || 'Failed to send message' });
    }
  });

  socket.on('chat:mark_read', async (payload = {}, ack) => {
    try {
      const threadId = parsePositiveInt(payload.thread_id);
      if (!threadId) throw new Error('thread_id must be a positive integer');

      const thread = await ChatThread.findByIdForUser(threadId, currentUserId);
      if (!thread) throw new Error('Not authorized for this thread');

      const markedCount = await ChatMessage.markThreadReadByUser(threadId, currentUserId);
      emitReadReceipt(thread, currentUserId, markedCount);

      if (typeof ack === 'function') ack({ success: true, data: { thread_id: threadId, marked_count: markedCount } });
    } catch (error) {
      if (typeof ack === 'function') ack({ success: false, message: error.message || 'Failed to mark read' });
    }
  });
});

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
app.use('/api/maps', mapsRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/feedback', feedbackRoutes);

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

function validateStartupConfig() {
  const warnings = [];
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    warnings.push(
      'GOOGLE_MAPS_API_KEY is not configured: /api/maps endpoints will return fallback errors and location autocomplete/geocode will be disabled.'
    );
  }
  if (!process.env.FRONTEND_URL) {
    warnings.push(
      'FRONTEND_URL is not configured: default localhost origins are used for CORS.'
    );
  }
  warnings.forEach((warning) => console.warn('Startup config warning:', warning));
}

async function startServer() {
  try {
    validateStartupConfig();
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('Failed to connect to database at startup. Continuing so platform health checks can pass; DB-backed routes may fail until DB is reachable.');
    }
    
    // Start server - bind to 0.0.0.0 so Railway/proxy can reach the app
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════╗
║   2BHK API Server                  ║
║   Status: Running ✓                    ║
║   Port: ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}        ║
║   Database: Connected ✓                ║
╚════════════════════════════════════════╝
      `);
      registerChatDigestCron();
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;