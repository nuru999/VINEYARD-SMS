require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth.routes');
const studentRoutes = require('./src/routes/student.routes');
const gradeRoutes = require('./src/routes/grade.routes');
const feeRoutes = require('./src/routes/fee.routes');
const reportRoutes = require('./src/routes/report.routes');
const { errorHandler } = require('./src/middleware/error.middleware');
const { authenticate } = require('./src/middleware/auth.middleware');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', authenticate, studentRoutes);
app.use('/api/grades', authenticate, gradeRoutes);
app.use('/api/fees', authenticate, feeRoutes);
app.use('/api/reports', authenticate, reportRoutes);

// M-Pesa Webhook (public endpoint for callbacks)
app.use('/api/webhooks', require('./src/routes/webhook.routes'));

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
});