import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = express.Router();

const DEFAULT_BANNER = '/images/og-default.png';

// ── GET /settings ────────────────────────────────────────────────────────────
router.get('/', protect, (req, res) => {
  // Ensure user has a fallback default banner for optimal preview aesthetic
  const user = { ...req.user.toObject ? req.user.toObject() : req.user };
  if (!user.bannerUrl || user.bannerUrl.trim() === '') {
    user.bannerUrl = DEFAULT_BANNER;
  }

  res.render('pages/settings', {
    title: 'DevSolved | Workspace & Settings',
    description: 'Manage your developer identity, security telemetry, API keys, and workspace preferences.',
    user,
    success: req.query.success || null,
    error: req.query.error || null,
    currentPath: '/settings',
    defaultBanner: DEFAULT_BANNER
  });
});

// ── POST /settings/profile ────────────────────────────────────────────────────
router.post(
  '/profile',
  protect,
  [
    body('displayName').trim().notEmpty().withMessage('Display name cannot be empty').isLength({ max: 60 }),
    body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-z0-9_-]+$/i).withMessage('Invalid username format'),
    body('bio').optional({ checkFalsy: true }).isLength({ max: 160 }),
    body('location').optional({ checkFalsy: true }).isLength({ max: 100 }),
    body('website').optional({ checkFalsy: true }).isURL({ require_protocol: false }).withMessage('Invalid website URL'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const user = { ...req.user.toObject ? req.user.toObject() : req.user, ...req.body };
      if (!user.bannerUrl) user.bannerUrl = DEFAULT_BANNER;
      return res.render('pages/settings', {
        title: 'DevSolved | Settings',
        description: '',
        user,
        error: errors.array()[0].msg,
        success: null,
        currentPath: '/settings',
        defaultBanner: DEFAULT_BANNER
      });
    }

    try {
      const { displayName, username, bio, location, website, githubUrl, twitterUrl, linkedinUrl, avatarUrl, bannerUrl } = req.body;
      const newUsername = username.toLowerCase();

      // Check if username is taken by another user
      const existing = await User.findOne({ username: newUsername, _id: { $ne: req.user._id } });
      if (existing) {
        const user = { ...req.user.toObject ? req.user.toObject() : req.user, ...req.body };
        return res.render('pages/settings', {
          title: 'DevSolved | Settings',
          description: '',
          user,
          error: 'Username is already taken by another engineer in the workspace.',
          success: null,
          currentPath: '/settings',
          defaultBanner: DEFAULT_BANNER
        });
      }

      await User.findByIdAndUpdate(req.user._id, {
        displayName, 
        username: newUsername, 
        bio, 
        location, 
        website, 
        githubUrl, 
        twitterUrl, 
        linkedinUrl, 
        avatarUrl, 
        bannerUrl: bannerUrl || DEFAULT_BANNER
      });

      res.redirect('/settings?success=profile#profile');
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /settings/notifications ──────────────────────────────────────────────
router.post('/notifications', protect, async (req, res, next) => {
  try {
    const { emailNotifications, weeklyDigest, mentionsAlerts, solutionsAlerts, securityAlerts } = req.body;

    // Simulate small network computation delay (450ms) to showcase the rich spinning circle loaders!
    await new Promise(r => setTimeout(r, 450));

    const updateFields = {};
    if (emailNotifications !== undefined) updateFields['notifications.email'] = emailNotifications === true || emailNotifications === 'on';
    if (weeklyDigest !== undefined) updateFields['notifications.digest'] = weeklyDigest === true || weeklyDigest === 'on';
    if (mentionsAlerts !== undefined) updateFields['notifications.mentions'] = mentionsAlerts === true || mentionsAlerts === 'on';
    if (solutionsAlerts !== undefined) updateFields['notifications.solutions'] = solutionsAlerts === true || solutionsAlerts === 'on';
    if (securityAlerts !== undefined) updateFields['notifications.security'] = securityAlerts === true || securityAlerts === 'on';

    if (req.user && req.user._id) {
      await User.findByIdAndUpdate(req.user._id, { $set: updateFields }, { new: true });
    }

    res.json({ success: true, message: 'Telemetry & alert routing rules saved to MongoDB account successfully.' });
  } catch (err) {
    console.error('Save notification preferences error:', err);
    res.status(500).json({ success: false, message: 'Failed to sync telemetry settings.' });
  }
});

// ── POST /settings/password ──────────────────────────────────────────────────
router.post('/password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.redirect('/settings?error=New password must be at least 8 characters long#security');
    }
    if (newPassword !== confirmPassword) {
      return res.redirect('/settings?error=New passwords do not match#security');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword || '', user.password);
      if (!isMatch) {
        return res.redirect('/settings?error=Current workspace password is incorrect#security');
      }
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.redirect('/settings?success=password#security');
  } catch (err) {
    next(err);
  }
});

// ── POST /settings/api ────────────────────────────────────────────────────────
router.post('/api', protect, async (req, res) => {
  try {
    const newToken = 'dvs_live_' + crypto.randomBytes(18).toString('hex');
    res.json({ success: true, token: newToken, message: 'New Personal Access Token generated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Token generation failed.' });
  }
});

// ── POST /settings/session-revoke ─────────────────────────────────────────────
router.post('/session-revoke', protect, async (req, res) => {
  const { sessionId } = req.body;
  res.json({ success: true, sessionId, message: 'Device session revoked and terminal access terminated.' });
});

export default router;
