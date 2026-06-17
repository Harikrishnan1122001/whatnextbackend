

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


require('dotenv').config(); // local dev only — on Vercel, set vars in Project Settings → Environment Variables

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Trust the reverse proxy ─────────────────────────────────
// Vercel sits in front of your function and sends X-Forwarded-For.
// Without this, express-rate-limit throws on EVERY request and the
// whole function crashes — this is almost certainly your main bug.
app.set('trust proxy', 1);

// ── Security & Logging ──────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(morgan('combined'));

// ── Rate Limiting ───────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  }
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// ── Body Parsers ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── CORS ────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// ── Static File Serving ─────────────────────────────────────
// NOTE: Vercel's filesystem is read-only/ephemeral outside /tmp.
// Files multer writes to ./uploads will NOT persist between
// invocations, so this won't actually serve user uploads in
// production. For real uploads on Vercel, use S3, Cloudinary,
// or similar object storage and store just the URL in Mongo.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Database Connection (cached across warm invocations) ────
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in the environment');
  }

  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
  console.log('✅ MongoDB connected');
}

// Ensure a DB connection exists before any request is handled.
// Cheap once the function is warm and already connected.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // Never call process.exit() here — that kills the whole
    // serverless function and whatever request is in flight.
    res.status(503).json({
      success: false,
      message: 'Database unavailable, please try again shortly.'
    });
  }
});

// ── Scheduler ───────────────────────────────────────────────
// node-cron needs a long-running process to keep timers alive.
// Serverless functions spin down between invocations, so this
// will not run reliably on Vercel. Use Vercel Cron Jobs
// (the "crons" field in vercel.json) for scheduled tasks instead.
if (!process.env.VERCEL) {
  try {
    const { startScheduler } = require('./utils/scheduler');
    startScheduler();
    console.log('✅ Scheduler started');
  } catch (error) {
    console.warn('⚠️ Scheduler not started:', error.message);
  }
}

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/live-classes', require('./routes/liveClassRoutes'));
app.use('/api/notes', require('./routes/notesRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Course Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ── Root Route ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Course Platform API'
  });
});

// ── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global Error:', err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
});

// ── Start Server (local dev only) ───────────────────────────
// On Vercel, the platform invokes the exported `app` per-request.
// app.listen() never runs there and would do nothing useful.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(
      `🚀 Server running on port ${PORT} in ${
        process.env.NODE_ENV || 'development'
      } mode`
    );
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;