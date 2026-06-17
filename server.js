

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

require('dotenv').config(); // MUST be first

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Trust Proxy ──────────────────────────────────────────────
// REQUIRED on Vercel (and any platform behind a reverse proxy).
// Without this, express-rate-limit can misread client IPs or
// throw validation errors on every request behind a proxy.
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
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
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
// NOTE: Vercel's filesystem is read-only (except /tmp) and is NOT
// persistent between requests/deployments. If you use multer to
// save uploads to disk, those files will disappear and this route
// won't serve anything reliable in production. For real uploads on
// Vercel, use S3/Cloudinary/another object store instead of local disk.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Scheduler ───────────────────────────────────────────────
// NOTE: node-cron relies on a long-running process to fire on schedule.
// Serverless functions spin up per-request and can be frozen/killed
// between invocations, so cron jobs here are NOT reliable on Vercel.
// Prefer Vercel Cron Jobs (vercel.json "crons") hitting an API route instead.
try {
  const { startScheduler } = require('./utils/scheduler');
  startScheduler();
  console.log('✅ Scheduler started');
} catch (error) {
  console.warn('⚠️ Scheduler not started:', error.message);
}

// ── Database Connection (serverless-safe) ───────────────────
// Never call process.exit() here — that kills the whole function
// invocation and is the most common cause of FUNCTION_INVOCATION_FAILED
// when env vars are misconfigured. Log the error and let requests
// fail with a normal 500 instead of nuking the process.
let isDbConnected = false;

async function connectDB() {
  if (isDbConnected) return;

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set. Add it in Vercel → Project Settings → Environment Variables.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    isDbConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // intentionally NOT calling process.exit() here
  }
}

mongoose.connection.on('disconnected', () => {
  isDbConnected = false;
});

connectDB();

// Make sure every request has a DB connection (handles cold starts
// where the request can arrive before the initial connect() resolves).
app.use(async (req, res, next) => {
  if (!isDbConnected) {
    await connectDB();
  }
  next();
});

// ── Routes (crash-proof loading) ─────────────────────────────
// IMPORTANT: each require() below uses a literal string path, not a
// variable. Vercel's bundler statically scans for require() calls
// to decide which files to include in the deployed function — a
// dynamic require(variable) is invisible to that scan, which is why
// "Cannot find module './routes/authRoutes'" happened even though
// the file exists in the repo. Literal paths fix that. Each one is
// still wrapped individually so a bug in one route file only takes
// down that route, not the whole app.
try {
  app.use('/api/auth', require('./routes/authRoutes'));
  console.log('✅ Mounted /api/auth');
} catch (err) {
  console.error('❌ Failed to load ./routes/authRoutes:', err.stack || err.message);
  app.use('/api/auth', (req, res) => {
    res.status(500).json({ success: false, message: 'Route "/api/auth" failed to load.', error: err.message });
  });
}

try {
  app.use('/api/courses', require('./routes/courseRoutes'));
  console.log('✅ Mounted /api/courses');
} catch (err) {
  console.error('❌ Failed to load ./routes/courseRoutes:', err.stack || err.message);
  app.use('/api/courses', (req, res) => {
    res.status(500).json({ success: false, message: 'Route "/api/courses" failed to load.', error: err.message });
  });
}

try {
  app.use('/api/live-classes', require('./routes/liveClassRoutes'));
  console.log('✅ Mounted /api/live-classes');
} catch (err) {
  console.error('❌ Failed to load ./routes/liveClassRoutes:', err.stack || err.message);
  app.use('/api/live-classes', (req, res) => {
    res.status(500).json({ success: false, message: 'Route "/api/live-classes" failed to load.', error: err.message });
  });
}

try {
  app.use('/api/notes', require('./routes/notesRoutes'));
  console.log('✅ Mounted /api/notes');
} catch (err) {
  console.error('❌ Failed to load ./routes/notesRoutes:', err.stack || err.message);
  app.use('/api/notes', (req, res) => {
    res.status(500).json({ success: false, message: 'Route "/api/notes" failed to load.', error: err.message });
  });
}

try {
  app.use('/api/payments', require('./routes/paymentRoutes'));
  console.log('✅ Mounted /api/payments');
} catch (err) {
  console.error('❌ Failed to load ./routes/paymentRoutes:', err.stack || err.message);
  app.use('/api/payments', (req, res) => {
    res.status(500).json({ success: false, message: 'Route "/api/payments" failed to load.', error: err.message });
  });
}

try {
  app.use('/api/admin', require('./routes/adminRoutes'));
  console.log('✅ Mounted /api/admin');
} catch (err) {
  console.error('❌ Failed to load ./routes/adminRoutes:', err.stack || err.message);
  app.use('/api/admin', (req, res) => {
    res.status(500).json({ success: false, message: 'Route "/api/admin" failed to load.', error: err.message });
  });
}

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Course Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    dbConnected: isDbConnected
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

// ── Start Server (local dev only) ────────────────────────────
// On Vercel, the platform invokes the exported `app` directly per
// request — it does not use app.listen(). Guarding this means local
// `node server.js` / `npm run dev` still works exactly as before.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(
      `🚀 Server running on port ${PORT} in ${
        process.env.NODE_ENV || 'development'
      } mode`
    );
  });

  // ── Graceful Shutdown ───────────────────────────────────────
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
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
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
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
  });
}

module.exports = app;