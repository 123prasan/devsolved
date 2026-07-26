import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false, // Never returned in queries unless explicitly requested
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      sparse: true,
    },
    verificationExpires: {
      type: Date,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [60, 'Display name cannot exceed 60 characters'],
    },
    bio: {
      type: String,
      maxlength: [160, 'Bio cannot exceed 160 characters'],
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    website: {
      type: String,
      default: '',
    },
    techStack: {
      type: [String],
      default: [],
    },
    githubUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    
    googleId: { type: String, sparse: true, unique: true },
    githubId: { type: String, sparse: true, unique: true },

    followedTags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],

    reputation: { type: Number, default: 0 },
    badges: [
      {
        name: String,
        description: String,
        iconName: String,
        tier: { type: String, enum: ['gold', 'blue', 'green'], default: 'blue' },
        awardedAt: { type: Date, default: Date.now },
      },
    ],

    notifications: {
      email: { type: Boolean, default: true },
      digest: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      solutions: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
    },

    isPro: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ reputation: -1 });
userSchema.index({ verificationExpires: 1 }, { expireAfterSeconds: 0 });

// ─── Instance Methods ───────────────────────────────────────────────────────
userSchema.methods.matchPassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// ─── Pre-save hook: hash password ──────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ─── Virtual: avatarFallback ───────────────────────────────────────────────
userSchema.virtual('avatarFallback').get(function () {
  return (
    this.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(this.displayName || this.username)}&background=4F46E5&color=fff&size=200`
  );
});

const User = mongoose.model('User', userSchema);
export default User;
