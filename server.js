

// require('dotenv').config(); // MUST be first

// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const path = require('path');
// const rateLimit = require('express-rate-limit');

// const app = express();

// // ── Security & Logging ──────────────────────────────────────
// app.use(
//   helmet({
//     crossOriginResourcePolicy: { policy: 'cross-origin' }
//   })
// );

// app.use(morgan('combined'));

// // ── Rate Limiting ───────────────────────────────────────────
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 200,
//   message: {
//     success: false,
//     message: 'Too many requests, please try again later.'
//   }
// });

// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 20,
//   message: {
//     success: false,
//     message: 'Too many login attempts, please try again later.'
//   }
// });

// app.use('/api', limiter);
// app.use('/api/auth', authLimiter);

// // ── Body Parsers ────────────────────────────────────────────
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // ── CORS ────────────────────────────────────────────────────
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || '*',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
//   })
// );

// // ── Static File Serving ─────────────────────────────────────
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // ── Scheduler ───────────────────────────────────────────────
// try {
//   const { startScheduler } = require('./utils/scheduler');
//   startScheduler();
//   console.log('✅ Scheduler started');
// } catch (error) {
//   console.warn('⚠️ Scheduler not started:', error.message);
// }

// // ── Database Connection ─────────────────────────────────────
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log('✅ MongoDB connected');
//   })
//   .catch((err) => {
//     console.error('❌ MongoDB connection error:', err.message);
//     process.exit(1);
//   });

// // ── Routes ──────────────────────────────────────────────────
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/courses', require('./routes/courseRoutes'));
// app.use('/api/live-classes', require('./routes/liveClassRoutes'));
// app.use('/api/notes', require('./routes/notesRoutes'));
// app.use('/api/payments', require('./routes/paymentRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// // ── Health Check ────────────────────────────────────────────
// app.get('/api/health', (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: 'Course Platform API is running',
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV || 'development'
//   });
// });

// // ── Root Route ──────────────────────────────────────────────
// app.get('/', (req, res) => {
//   res.json({
//     success: true,
//     message: 'Welcome to Course Platform API'
//   });
// });

// // ── 404 Handler ─────────────────────────────────────────────
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.originalUrl} not found`
//   });
// });

// // ── Global Error Handler ────────────────────────────────────
// app.use((err, req, res, next) => {
//   console.error('Global Error:', err);

//   const statusCode = err.statusCode || 500;

//   res.status(statusCode).json({
//     success: false,
//     message: err.message || 'Internal Server Error',
//     ...(process.env.NODE_ENV === 'development' && {
//       stack: err.stack
//     })
//   });
// });

// // ── Start Server ────────────────────────────────────────────
// const PORT = process.env.PORT || 5000;

// const server = app.listen(PORT, () => {
//   console.log(
//     `🚀 Server running on port ${PORT} in ${
//       process.env.NODE_ENV || 'development'
//     } mode`
//   );
// });

// // ── Graceful Shutdown ───────────────────────────────────────
// process.on('SIGTERM', async () => {
//   console.log('SIGTERM received. Shutting down gracefully...');

//   server.close(async () => {
//     try {
//       await mongoose.connection.close();
//       console.log('✅ MongoDB connection closed');
//       process.exit(0);
//     } catch (err) {
//       console.error('❌ Error closing MongoDB connection:', err);
//       process.exit(1);
//     }
//   });
// });

// process.on('SIGINT', async () => {
//   console.log('SIGINT received. Shutting down gracefully...');

//   server.close(async () => {
//     try {
//       await mongoose.connection.close();
//       console.log('✅ MongoDB connection closed');
//       process.exit(0);
//     } catch (err) {
//       console.error('❌ Error closing MongoDB connection:', err);
//       process.exit(1);
//     }
//   });
// });

// module.exports = app;


require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

/* =====================================================
   SECURITY & LOGGING
===================================================== */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(morgan('combined'));

/* =====================================================
   RATE LIMITING
===================================================== */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  }
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

/* =====================================================
   BODY PARSER
===================================================== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* =====================================================
   CORS
===================================================== */
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/* =====================================================
   STATIC FILES
===================================================== */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =====================================================
   SCHEDULER
===================================================== */
try {
  const { startScheduler } = require('./utils/scheduler');

  if (process.env.NODE_ENV !== 'production') {
    startScheduler();
    console.log('✅ Scheduler started');
  }
} catch (error) {
  console.warn('⚠️ Scheduler not started:', error.message);
}

/* =====================================================
   MONGODB CONNECTION
===================================================== */
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI);

    isConnected = db.connections[0].readyState === 1;

    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
};

connectDB();

/* =====================================================
   ROUTES
===================================================== */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/live-classes', require('./routes/liveClassRoutes'));
app.use('/api/notes', require('./routes/notesRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

/* =====================================================
   HEALTH CHECK
===================================================== */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Course Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/* =====================================================
   ROOT ROUTE
===================================================== */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Course Platform API'
  });
});

/* =====================================================
   404 HANDLER
===================================================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */
app.use((err, req, res, next) => {
  console.error('Global Error:', err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
});

/* =====================================================
   EXPORT APP FOR VERCEL
===================================================== */
module.exports = app;