import Post from '../models/Post.js';
import { getUserTagAffinity, calcAffinityMultiplier } from './redisService.js';

const FEED_SIZE = 50;
const RESOLVED_RATIO = 0.8; // 80% resolved, 20% investigating
const MAX_SAME_TAG_RUN = 2;  // No more than 2 consecutive posts with the same tag

// ─── Pipeline A: Anonymous Feed ─────────────────────────────────────────────
/**
 * Fetches top posts by globalScore with:
 * - 80/20 resolved/investigating ratio enforcement
 * - Tag diversity (no >2 same-tag posts in a row)
 *
 * @param {Object} opts - { tagFilter, statusFilter, page }
 * @returns {Promise<Post[]>}
 */
export const getAnonymousFeed = async (opts = {}) => {
  const { tagFilter, statusFilter, severityFilter, authorFilter, sortFilter = 'trending', limit = FEED_SIZE } = opts;

  const baseQuery = { isDraft: false };
  if (tagFilter) baseQuery.tagNames = tagFilter;
  if (statusFilter) baseQuery.status = { $in: statusFilter.split(',') };
  if (severityFilter) baseQuery.severity = { $in: severityFilter.split(',') };
  if (authorFilter) baseQuery.author = { $in: authorFilter };

  // Fetch more than needed to allow for ratio + diversity enforcement
  const candidateCount = limit * 3;
  const sortCriteria = sortFilter === 'latest' ? { createdAt: -1 } : { globalScore: -1, createdAt: -1 };

  // When multiple statuses are requested, we don't need to enforce a specific ratio
  // or we can just fetch all candidates and sort them.
  // We'll adjust ratio logic to handle generic baseQuery.
  const resolvedPosts = (!statusFilter || statusFilter.includes('resolved'))
    ? await Post.find({ ...baseQuery, status: 'resolved' })
      .sort(sortCriteria)
      .limit(Math.ceil(candidateCount * RESOLVED_RATIO))
      .populate('author', 'username displayName avatarUrl reputation')
      .populate('tags', 'name displayName color')
      .lean()
    : [];

  const investigatingPosts = (!statusFilter || statusFilter.includes('investigating'))
    ? await Post.find({ ...baseQuery, status: 'investigating' })
      .sort(sortCriteria)
      .limit(Math.ceil(candidateCount * (1 - RESOLVED_RATIO)))
      .populate('author', 'username displayName avatarUrl reputation')
      .populate('tags', 'name displayName color')
      .lean()
    : [];

  // If a specific status filter is set (and only one), don't interleave
  const merged = (statusFilter && statusFilter.split(',').length === 1)
    ? [...resolvedPosts, ...investigatingPosts].sort((a, b) => sortFilter === 'latest' ? new Date(b.createdAt) - new Date(a.createdAt) : b.globalScore - a.globalScore)
    : interleaveWithRatio(resolvedPosts, investigatingPosts, RESOLVED_RATIO);

  return enforceTagDiversity(merged, MAX_SAME_TAG_RUN, limit);
};

// ─── Pipeline B: Personalized Feed (Shadow Graph) ──────────────────────────
/**
 * Personalizes the feed for a logged-in user by applying AffinityMultipliers
 * based on their Redis session data (dwell time per tag) and followed tags.
 *
 * @param {Object} user   - Mongoose user document
 * @param {Object} opts   - { tagFilter, statusFilter }
 * @returns {Promise<Post[]>}
 */
export const getPersonalizedFeed = async (user, opts = {}) => {
  const { tagFilter, statusFilter, severityFilter, authorFilter, sortFilter = 'trending' } = opts;

  // Step 1: Get baseline anonymous feed candidates (larger pool)
  const baseQuery = { isDraft: false };
  if (tagFilter) baseQuery.tagNames = tagFilter;
  if (statusFilter) baseQuery.status = { $in: statusFilter.split(',') };
  if (severityFilter) baseQuery.severity = { $in: severityFilter.split(',') };
  if (authorFilter) baseQuery.author = { $in: authorFilter };

  const sortCriteria = sortFilter === 'latest' ? { createdAt: -1 } : { globalScore: -1, createdAt: -1 };

  const candidates = await Post.find(baseQuery)
    .sort(sortCriteria)
    .limit(150) // Larger candidate pool for personalization
    .populate('author', 'username displayName avatarUrl reputation')
    .populate('tags', 'name displayName color')
    .lean();

  // If sortFilter is 'latest', skip personalization multipliers completely
  if (sortFilter === 'latest') {
    return enforceTagDiversity(candidates, MAX_SAME_TAG_RUN, FEED_SIZE);
  }

  // Step 2: Get user's tag affinity from Redis Shadow Graph
  const tagAffinity = await getUserTagAffinity(user._id.toString());
  const followedTagIds = new Set((user.followedTags || []).map((t) => t.toString()));

  // Step 3: Score each post with affinity multipliers
  const scored = candidates.map((post) => {
    let maxMultiplier = 1.0;

    for (const tag of post.tags || []) {
      const tagId = tag._id.toString();
      const tagName = tag.name;

      // Followed tags: 1.5× base multiplier
      let mult = followedTagIds.has(tagId) ? 1.5 : 1.0;

      // Redis session dwell multiplier (up to 3.0×, overrides follow if higher)
      if (tagAffinity[tagName]) {
        mult = Math.max(mult, calcAffinityMultiplier(tagAffinity[tagName]));
      }

      maxMultiplier = Math.max(maxMultiplier, mult);
    }

    return {
      ...post,
      personalizedScore: post.globalScore * maxMultiplier,
    };
  });

  // Step 4: Sort by personalized score and enforce diversity
  scored.sort((a, b) => b.personalizedScore - a.personalizedScore);
  return enforceTagDiversity(scored, MAX_SAME_TAG_RUN, FEED_SIZE);
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Interleaves two arrays maintaining a target ratio.
 * E.g. ratio=0.8 means for every 4 resolved, 1 investigating.
 */
function interleaveWithRatio(majority, minority, majorityRatio) {
  const result = [];
  let mi = 0, mni = 0;
  const step = Math.round(1 / (1 - majorityRatio)); // e.g. 5 for 0.8

  let i = 0;
  while (mi < majority.length || mni < minority.length) {
    if (i % step === step - 1 && mni < minority.length) {
      result.push(minority[mni++]);
    } else if (mi < majority.length) {
      result.push(majority[mi++]);
    } else if (mni < minority.length) {
      result.push(minority[mni++]);
    }
    i++;
  }
  return result;
}

/**
 * Ensures no more than `maxRun` consecutive posts share the same primary tag.
 * Uses a sliding window approach.
 */
function enforceTagDiversity(posts, maxRun, limit) {
  const result = [];
  const deferred = [];
  let lastTag = null;
  let runCount = 0;

  for (const post of posts) {
    if (result.length >= limit) break;
    const primaryTag = post.tags?.[0]?.name || null;

    if (primaryTag === lastTag) {
      runCount++;
      if (runCount >= maxRun) {
        deferred.push(post);
        continue;
      }
    } else {
      // Try to insert a deferred post of different tag
      if (deferred.length > 0) {
        result.push(deferred.shift());
      }
      lastTag = primaryTag;
      runCount = 1;
    }
    result.push(post);
  }

  // Append any remaining deferred posts
  for (const post of deferred) {
    if (result.length >= limit) break;
    result.push(post);
  }

  return result.slice(0, limit);
}
