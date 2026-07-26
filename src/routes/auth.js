import express from 'express';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import crypto from 'crypto';
import User from '../models/User.js';
import { setAuthCookie } from '../middleware/auth.js';
import { sendVerificationEmail } from '../services/emailService.js';

const router = express.Router();

// ── GET /login ──────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('pages/login', {
    title: 'DevSolved | Authentication',
    error: req.query.error || null,
    next: req.query.next || '/',
  });
});

// ── POST /login ──────────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('pages/login', {
        title: 'DevSolved | Authentication',
        error: errors.array()[0].msg,
        next: req.body.next || '/',
      });
    }

    const { email, password, next = '/' } = req.body;

    try {
      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user || !(await user.matchPassword(password))) {
        return res.render('pages/login', {
          title: 'DevSolved | Authentication',
          error: 'Invalid email or password',
          next,
        });
      }

      if (!user.isVerified) {
        return res.render('pages/login', {
          title: 'DevSolved | Authentication',
          error: 'Please check your email to verify your account before logging in.',
          next,
        });
      }

      setAuthCookie(res, user._id);
      return res.redirect(next.startsWith('/') ? next : '/');
    } catch (err) {
      console.error(err);
      return res.render('pages/login', {
        title: 'DevSolved | Authentication',
        error: 'An error occurred. Please try again.',
        next,
      });
    }
  }
);

// ── GET /signup ──────────────────────────────────────────────────────────────
router.get('/signup', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('pages/login', {
    title: 'DevSolved | Create Account',
    error: null,
    mode: 'signup',
    next: '/',
  });
});

// ── POST /signup ──────────────────────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-z0-9_-]+$/i)
      .withMessage('Username must be 3-30 chars, letters/numbers/underscore/hyphen only'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('displayName').trim().notEmpty().withMessage('Display name required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('pages/login', {
        title: 'DevSolved | Create Account',
        error: errors.array()[0].msg,
        mode: 'signup',
        next: '/',
      });
    }

    const { username, email, password, displayName } = req.body;

    try {
      const existing = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] });
      if (existing) {
        return res.render('pages/login', {
          title: 'DevSolved | Create Account',
          error: existing.email === email ? 'Email already registered' : 'Username already taken',
          mode: 'signup',
          next: '/',
        });
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      const user = new User({
        username: username.toLowerCase(),
        email,
        passwordHash: password, // Pre-save hook hashes this
        displayName,
        verificationToken,
        verificationExpires,
      });
      await user.save();

      // Send the verification email in the background
      const host = `${req.protocol}://${req.get('host')}`;
      sendVerificationEmail(email, verificationToken, host).catch(console.error);

      return res.render('pages/login', {
        title: 'DevSolved | Authentication',
        error: 'Registration successful! Please check your email to verify your account.',
        mode: 'login',
        next: '/',
      });
    } catch (err) {
      console.error(err);
      return res.render('pages/login', {
        title: 'DevSolved | Create Account',
        error: 'Registration failed. Please try again.',
        mode: 'signup',
        next: '/',
      });
    }
  }
);

// ── GET /auth/verify/:token ────────────────────────────────────────────────────────
router.get('/auth/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('pages/login', {
        title: 'DevSolved | Authentication',
        error: 'Verification link is invalid or has expired.',
        mode: 'login',
        next: '/'
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    setAuthCookie(res, user._id);
    return res.redirect('/?verified=true');
  } catch (err) {
    console.error(err);
    return res.redirect('/login?error=Verification failed');
  }
});

// ── POST /logout ──────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// ── OAuth: Google ─────────────────────────────────────────────────────────────
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=Google auth failed', session: false }),
  (req, res) => {
    setAuthCookie(res, req.user._id);
    res.redirect('/');
  }
);

// ── OAuth: GitHub ─────────────────────────────────────────────────────────────
router.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], session: false }));

router.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login?error=GitHub auth failed', session: false }),
  (req, res) => {
    setAuthCookie(res, req.user._id);
    res.redirect('/');
  }
);

export default router;
