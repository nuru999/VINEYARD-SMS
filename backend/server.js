require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const studentRoutes = require('./src/routes/student.routes');
const gradeRoutes = require('./src/routes/grades.routes');
const feeRoutes = require('./src/routes/fee.routes');
const reportRoutes = require('./src/routes/report.routes');
const webhookRoutes = require('./src/routes/webhook.routes'); // Added import

// Middleware imports
const { errorHandler } = require('./src/middleware/error.middleware');
const { authenticate } = require('./src/middleware/auth.middleware');

// Database (optional: test connection on startup)
const db = require('./src/config/database');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
  corsOrigin,
  'http://localhost:5174'
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests and local frontend origins.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - SKIP webhooks!
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes (not webhooks)
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for webhooks
  if (req.path.startsWith('/webhooks')) {
    return next();
  }
  apiLimiter(req, res, next);
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============== ROUTES ==============

// Public routes (NO authentication)
app.get('/api/health', async (req, res) => {
  // Optional: check DB connection
  let dbStatus = 'unknown';
  try {
    await db.query('SELECT NOW()');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
  }
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes); // Public - M-Pesa callbacks

// Protected routes (require authentication)
app.use('/api/students', authenticate, studentRoutes);
app.use('/api/grades', authenticate, gradeRoutes);
app.use('/api/fees', authenticate, feeRoutes);
app.use('/api/reports', authenticate, reportRoutes);

// ============== ERROR HANDLING ==============

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// ============== SERVER STARTUP ==============

const PORT = process.env.PORT || 5000;
let server;

const startServer = () => {
  server = app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    
    // Test database connection on startup
    try {
      const result = await db.query('SELECT NOW() as current_time');
      console.log(`✅ Database connected: ${result.rows[0].current_time}`);
    } catch (err) {
      console.error('❌ Database connection failed:', err.message);
      console.log('⚠️  Server running but database is unavailable');
    }
  });
};

if (require.main === module) {
  startServer();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('💤 Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('👋 SIGINT received. Shutting down gracefully...');
    server.close(() => {
      console.log('💤 Server closed');
      process.exit(0);
    });
  });
}

module.exports = app;