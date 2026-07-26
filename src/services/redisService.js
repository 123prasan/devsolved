import { getRedis, isRedisAvailable } from '../config/redis.js';

const DWELL_TTL = 48 * 60 * 60; // 48 hours in seconds

// ─── Keys ──────────────────────────────────────────────────────────────────
const dwellKey = (userId) => `user:${userId}:dwell`;
const tagKey = (userId) => `user:${userId}:tags`;
const clickKey = (postId) => `post:${postId}:clicks`;

/**
 * Record the dwell time a user spent on a post.
 * Also accumulates dwell time per tag for Shadow Graph affinity.
 *
 * @param {string} userId
 * @param {string} postId
 * @param {string[]} tagNames  — denormalized tag names from the post
 * @param {number} dwellMs     — milliseconds the user spent reading
 */
export const recordDwell = async (userId, postId, tagNames, dwellMs) => {
  if (!isRedisAvailable() || !userId || dwellMs < 3000) return; // Ignore <3s accidental hovers
  const redis = getRedis();
  const pipeline = redis.pipeline();

  // Record per-post dwell
  pipeline.hset(dwellKey(userId), postId, dwellMs);
  pipeline.expire(dwellKey(userId), DWELL_TTL);

  // Accumulate dwell per tag (Shadow Graph)
  for (const tag of tagNames) {
    pipeline.hincrby(tagKey(userId), tag, dwellMs);
    pipeline.expire(tagKey(userId), DWELL_TTL);
  }

  await pipeline.exec();
};

/**
 * Record a click-through event for a post.
 */
export const recordClick = async (postId) => {
  if (!isRedisAvailable()) return;
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.incr(clickKey(postId));
  pipeline.expire(clickKey(postId), DWELL_TTL);
  await pipeline.exec();
};

/**
 * Get the full tag affinity map for a user.
 * Returns: { tagName: totalDwellMs }
 *
 * @param {string} userId
 * @returns {Object}
 */
export const getUserTagAffinity = async (userId) => {
  if (!isRedisAvailable() || !userId) return {};
  const redis = getRedis();
  const raw = await redis.hgetall(tagKey(userId));
  if (!raw) return {};
  // Convert string values to numbers
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, parseInt(v, 10)]));
};

/**
 * Calculate the affinity multiplier for a single tag.
 * Formula: min(3.0, 1.0 + (totalDwellMs / 60_000) × 0.5)
 * Example: 2 min dwell → 1.0 + (120 × 0.5) / 60 = 2.0×
 *
 * @param {number} totalDwellMs
 * @returns {number} multiplier between 1.0 and 3.0
 */
export const calcAffinityMultiplier = (totalDwellMs) => {
  return Math.min(3.0, 1.0 + (totalDwellMs / 60000) * 0.5);
};
