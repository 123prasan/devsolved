import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from './config/passport.js';

import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import pageRoutes from './routes/pages.js';
import savedRoutes from './routes/saved.js';
import settingsRoutes from './routes/settings.js';
import notificationsRoutes from './routes/notifications.js';
import apiRoutes from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);

// ── Security & Parsing ───────────────────────────────────────────────────────
app.use(compression());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net'
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'https://ui-avatars.com'],
        connectSrc: ["'self'", 'https://lottie.host', 'https://unpkg.com'],
        frameSrc: ["'self'", "data:", "about:blank"],
        mediaSrc: ["'self'", 'https://lottie.host'],
        objectSrc: ["'none'"],
      },
    },
  })
);

app.use(cors({ origin: process.env.APP_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Static Files & Passport ──────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: true
}));
app.use(passport.initialize());

// ── View Engine (EJS) ─────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Locals available to ALL views ─────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.appUrl = process.env.APP_URL || 'http://localhost:3000';
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', authRoutes);
app.use('/', pageRoutes);
app.use('/saved', savedRoutes);
app.use('/settings', settingsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/api', apiRoutes);

// ── 404 & Error Handling ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
