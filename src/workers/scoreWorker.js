import cron from 'node-cron';
import Post, { SEVERITY_MULTIPLIERS, GRAVITY } from '../models/Post.js';
import Tag from '../models/Tag.js';

/**
 * Global Score Worker
 * Runs every 5 minutes to recalculate globalScore for all active posts.
 *
 * Formula:
 *   S_global = ((upvotes×1 + saves×3 + comments×4) × SeverityMultiplier)
 *              ÷ (ageInHours + 2)^Gravity
 *
 * Gravity:   resolved=1.4, investigating=2.5 (investigating decays faster)
 * Severity:  critical=2.0, high=1.5, normal=1.0, low=0.7
 */
const runScoreUpdate = async () => {
  try {
    const start = Date.now();

    // Only score posts from the last 14 days (older posts stabilize near 0)
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const posts = await Post.find({
      isDraft: false,
      createdAt: { $gte: cutoff },
    }).select('upvotes saves comments status severity createdAt tagNames');

    if (posts.length === 0) return;

    const now = Date.now();
    const bulkOps = posts.map((post) => {
      const ageInHours = (now - post.createdAt.getTime()) / (1000 * 60 * 60);
      const engagement = post.upvotes * 1 + post.saves * 3 + post.comments * 4;
      const severityMult = SEVERITY_MULTIPLIERS[post.severity] || 1.0;
      const gravity = GRAVITY[post.status] || 1.4;
      const score = (engagement * severityMult) / Math.pow(ageInHours + 2, gravity);

      return {
        updateOne: {
          filter: { _id: post._id },
          update: {
            $set: {
              globalScore: Math.max(0, parseFloat(score.toFixed(6))),
              scoreUpdatedAt: new Date(),
            },
          },
        },
      };
    });

    await Post.bulkWrite(bulkOps, { ordered: false });

    // Also update weekly tag counts
    await updateWeeklyTagCounts();

    const elapsed = Date.now() - start;
    console.log(`⚡ Score worker: updated ${posts.length} posts in ${elapsed}ms`);
  } catch (err) {
    console.error('❌ Score worker failed:', err.message);
  }
};

/**
 * Update weeklyCount on each Tag — counts posts created in the last 7 days.
 * Used by the "Trending Tech" sidebar widget.
 */
const updateWeeklyTagCounts = async () => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentPosts = await Post.find({ isDraft: false, createdAt: { $gte: weekAgo } })
    .select('tagNames')
    .lean();

  const tagCounts = {};
  for (const post of recentPosts) {
    for (const tag of post.tagNames || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const tagBulkOps = Object.entries(tagCounts).map(([name, count]) => ({
    updateOne: {
      filter: { name },
      update: { $set: { weeklyCount: count } },
    },
  }));

  if (tagBulkOps.length > 0) {
    await Tag.bulkWrite(tagBulkOps, { ordered: false });
  }
};

/**
 * Starts the cron scheduler.
 * Call this once from server.js after DB connection.
 */
export const startScoreWorker = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', runScoreUpdate, {
    scheduled: true,
    timezone: 'UTC',
  });

  // Run immediately on startup to populate scores for seeded data
  setTimeout(runScoreUpdate, 3000);

  console.log('✅ Score worker started — running every 5 minutes');
};
