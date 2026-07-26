import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect middleware — requires a valid JWT.
 * Reads from httpOnly cookie "token" (set on login).
 * Attaches the full user document to req.user.
 */
export const protect = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .populate('followedTags', 'name')
      .lean();

    if (!user) {
      res.clearCookie('token');
      return res.redirect('/login');
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

/**
 * OptionalAuth middleware — attaches user if logged in, but doesn't block.
 * Used for pages that work for both anonymous and authenticated users (e.g. Home).
 */
export const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .populate('followedTags', 'name')
      .lean();
    req.user = user || null;
  } catch {
    req.user = null;
    res.clearCookie('token');
  }

  next();
};

/**
 * Require API auth — returns 401 JSON instead of redirect.
 * Use for /api/* routes.
 */
export const requireApiAuth = async (req, res, next) => {
  const token = req.cookies?.token || req.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean();
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Helper: Sign and set JWT cookie on the response.
 */
export const setAuthCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
};
