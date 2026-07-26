import express from 'express';
import { protect, optionalAuth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// ── GET /saved ──────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'savedPosts',
        match: { isDraft: false },
        populate: [
          { path: 'author', select: 'username displayName avatarUrl' },
          { path: 'tags', select: 'name displayName color' },
        ],
        options: { sort: { createdAt: -1 } },
      })
      .lean();

    res.render('pages/saved', {
      title: 'DevSolved | Saved Items',
      description: 'Your saved incidents and postmortems.',
      user: req.user,
      savedPosts: user?.savedPosts || [],
      currentPath: '/saved',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
