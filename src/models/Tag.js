import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: { type: String, trim: true }, // e.g. "Node.js" for name "nodejs"
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['cloud', 'database', 'devops', 'frontend', 'language', 'backend', 'other'],
      default: 'other',
    },

    // Brand color (hex) — used by tags.ejs for dynamic sparkline & icon glow
    color: { type: String, default: '#A1A1AA' },

    // SVG path data for the tag icon — matches your tags.html JS data
    iconSvg: { type: String, default: '' },

    // Stats — updated by scoreWorker
    incidentCount: { type: Number, default: 0 },
    weeklyCount: { type: Number, default: 0 },   // Posts in last 7 days
    followersCount: { type: Number, default: 0 },

    topSolvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
tagSchema.index({ name: 1 }, { unique: true });
tagSchema.index({ incidentCount: -1 });  // For "Trending Tags" widget
tagSchema.index({ weeklyCount: -1 });    // For weekly trending sort
tagSchema.index({ category: 1 });        // For category filter on /tags page

const Tag = mongoose.model('Tag', tagSchema);
export default Tag;
