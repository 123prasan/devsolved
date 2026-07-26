import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';

// Helper function to generate a unique username for new OAuth users
const generateUniqueUsername = async (baseName) => {
  let username = baseName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 20); // Keep it under max length constraints

  if (username.length < 3) {
    username = 'user' + username;
  }

  let isUnique = false;
  let counter = 0;
  let finalUsername = username;

  while (!isUnique) {
    const existingUser = await User.findOne({ username: finalUsername });
    if (!existingUser) {
      isUnique = true;
    } else {
      counter++;
      finalUsername = `${username}${counter}`;
    }
  }
  return finalUsername;
};

// ── Google Strategy ──────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'https://www.devsolved.com/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 1. Check if user already exists with this Google ID
          let user = await User.findOne({ googleId: profile.id });
          if (user) {
            return done(null, user);
          }

          // 2. Check if a user exists with this email
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              // Link the Google account to the existing email
              user.googleId = profile.id;
              if (!user.avatarUrl && profile.photos && profile.photos[0]) {
                user.avatarUrl = profile.photos[0].value;
              }
              await user.save();
              return done(null, user);
            }
          }

          // 3. Create a new user
          const displayName = profile.displayName || 'Google User';
          const baseName = email ? email.split('@')[0] : displayName;
          const uniqueUsername = await generateUniqueUsername(baseName);

          user = new User({
            googleId: profile.id,
            email: email || `${profile.id}@google.oauth`, // Fallback if no email provided
            displayName,
            username: uniqueUsername,
            avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            isVerified: true,
          });

          await user.save();
          return done(null, user);
        } catch (err) {
          console.error('Google OAuth Error:', err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️ Google OAuth is NOT configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET).');
}

// ── GitHub Strategy ──────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: 'https://www.devsolved.com/auth/github/callback',
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 1. Check if user exists with this GitHub ID
          let user = await User.findOne({ githubId: profile.id });
          if (user) {
            return done(null, user);
          }

          // 2. Check if a user exists with this email
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              // Link the GitHub account
              user.githubId = profile.id;
              if (!user.avatarUrl && profile.photos && profile.photos[0]) {
                user.avatarUrl = profile.photos[0].value;
              }
              await user.save();
              return done(null, user);
            }
          }

          // 3. Create a new user
          const displayName = profile.displayName || profile.username || 'GitHub User';
          const baseName = profile.username || (email ? email.split('@')[0] : 'user');
          const uniqueUsername = await generateUniqueUsername(baseName);

          user = new User({
            githubId: profile.id,
            email: email || `${profile.id}@github.oauth`,
            displayName,
            username: uniqueUsername,
            avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            githubUrl: profile.profileUrl || '',
            isVerified: true,
          });

          await user.save();
          return done(null, user);
        } catch (err) {
          console.error('GitHub OAuth Error:', err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️ GitHub OAuth is NOT configured (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET).');
}

export default passport;
