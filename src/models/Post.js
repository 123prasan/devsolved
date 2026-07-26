import mongoose from 'mongoose';
import slugify from 'slugify';

// Severity and gravity constants for the feed scoring formula
export const SEVERITY_MULTIPLIERS = {
  critical: 2.0,
  high: 1.5,
  normal: 1.0,
  low: 0.7,
};

export const GRAVITY = {
  resolved: 1.4,
  investigating: 2.5,
};

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [10, 'Title must be at least 10 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    },

    // Full structured content — stored as an array of block objects
    content: [mongoose.Schema.Types.Mixed],

    coverImage: { type: String, default: '' },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    tagNames: [String], // Denormalized for fast keyword search

    status: {
      type: String,
      enum: ['resolved', 'investigating'],
      default: 'investigating',
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'normal', 'low'],
      default: 'normal',
    },
    githubPrUrl: { type: String, default: '' },
    githubPrRepAwarded: { type: Boolean, default: false },
    githubPrMetadata: {
      title: { type: String, default: '' },
      author: { type: String, default: '' },
      state: { type: String, default: 'merged' },
      additions: { type: Number, default: 0 },
      deletions: { type: Number, default: 0 },
      diffSnippet: { type: String, default: '' },
    },
    investigationHours: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ── Engagement Metrics ──────────────────────────────────────────────────
    isDraft: { type: Boolean, default: false },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    saves: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    // ── Feed Engine: Global Score ───────────────────────────────────────────
    // Updated every 5 minutes by scoreWorker.js
    // Formula: ((upvotes*1 + saves*3 + comments*4) * severityMult) / (ageHours+2)^gravity
    globalScore: { type: Number, default: 0 },
    scoreUpdatedAt: { type: Date, default: Date.now },

    // ── Semantic Search: 384-dim MiniLM embedding ──────────────────────────
    // Generated when post is created/updated via Transformers.js
    embedding: {
      type: [Number],
      default: [],
      select: false, // Excluded from regular queries for performance
    },

    isDraft: { type: Boolean, default: false },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

// ─── Compound Indexes for Lightning-Fast Feed Queries ──────────────────────
postSchema.index({ globalScore: -1, createdAt: -1 });           // Main feed sort
postSchema.index({ tags: 1, globalScore: -1 });                  // Tag-filtered feed
postSchema.index({ author: 1, createdAt: -1 });                  // Profile feed
postSchema.index({ status: 1, globalScore: -1 });                // Status-filtered feed
postSchema.index({ slug: 1 }, { unique: true });                 // Post lookup
postSchema.index({ tagNames: 'text', title: 'text', excerpt: 'text' }); // MongoDB text search (BM25-style)
postSchema.index({ isDraft: 1, publishedAt: -1 });               // Draft management

// ─── Pre-save: Auto-generate slug from title ───────────────────────────────
postSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('title')) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true,
    }) + '-' + Date.now().toString(36); // Append base36 timestamp to ensure uniqueness
  }
  if (this.status === 'resolved' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// ─── Method: Calculate global score ────────────────────────────────────────
postSchema.methods.calculateGlobalScore = function () {
  const ageInHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  const engagement = this.upvotes * 1 + this.saves * 3 + this.comments * 4;
  const severity = SEVERITY_MULTIPLIERS[this.severity] || 1.0;
  const gravity = GRAVITY[this.status] || 1.4;
  return (engagement * severity) / Math.pow(ageInHours + 2, gravity);
};

const Post = mongoose.model('Post', postSchema);
export default Post;
