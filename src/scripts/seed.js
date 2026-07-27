/**
 * DevSolved Seed Script
 * Populates the database with real Tags, Users, and Posts
 * Run with: npm run seed
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Tag from '../models/Tag.js';
import User from '../models/User.js';
import Post from '../models/Post.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsolved';

const tags = [
  { name: 'aws', displayName: 'AWS', category: 'cloud', color: '#FF9900', description: 'Amazon Web Services. Covers S3 multipart upload failures, IAM permission boundaries, Lambda timeouts, and VPC networking issues.', iconSvg: '<path d="M14.07 15.69c-1.39.81-3.21 1.25-4.88 1.25-3.04 0-5.46-1.36-6.88-3.41l1.77-1.12c1.07 1.6 2.87 2.52 5.06 2.52 1.34 0 2.8-.37 3.86-.96l1.07 1.72zM19.16 7.62h-1.68l-3.32 8.4h1.76l.66-1.8h3.33l.63 1.8h1.79l-3.17-8.4zm-1.85 5.09l1-2.92 1.05 2.92h-2.05zM5.9 7.62H4.2l-2.93 8.4h1.79l.64-1.92h2.95l.66 1.92h1.78l-3.19-8.4zm-1.46 5.03l.93-2.82.91 2.82H4.44z"/>' },
  { name: 'nodejs', displayName: 'Node.js', category: 'backend', color: '#339933', description: 'Event-driven JavaScript runtime. Discover solutions for memory leaks, event loop blocking, and tricky Express middleware bugs.', iconSvg: '<path d="M11.83 0L2.1 5.48v11.02L11.83 22l9.74-5.5V5.48L11.83 0zm7.88 15.5l-7.88 4.45-7.88-4.45V6.5l7.88-4.45 7.88 4.45v9z"/>' },
  { name: 'postgresql', displayName: 'PostgreSQL', category: 'database', color: '#336791', description: 'Relational database management system. High-value postmortems on connection pooling, indexing, deadlocks, and slow queries.', iconSvg: '<path d="M12 2C6.48 2 2 6.48 2 12c0 5.51 4.48 10 10 10s10-4.49 10-10C22 6.48 17.52 2 12 2z"/>' },
  { name: 'react', displayName: 'React', category: 'frontend', color: '#61DAFB', description: 'JavaScript UI library. Discover exact solutions for infinite re-renders, stale closures in hooks, and complex state management bugs.', iconSvg: '<path d="M12 10.4c-.88 0-1.6.72-1.6 1.6s.72 1.6 1.6 1.6 1.6-.72 1.6-1.6-.72-1.6-1.6-1.6zm8.1 1.6c0-3.32-3.62-6-8.1-6s-8.1 2.68-8.1 6 3.62 6 8.1 6 8.1-2.68 8.1-6z"/>' },
  { name: 'docker', displayName: 'Docker', category: 'devops', color: '#2496ED', description: 'Containerization platform. Learn how others fixed networking bridge issues, layer caching bloat, and volume mounting permission errors.', iconSvg: '<path d="M22 11.5c-.5-.3-1.7-.5-2.7-.3-.1-.9-.7-1.8-1.6-2.3l-.5-.3-.3.5c-.4.6-.5 1.5-.3 2.2-.4-.2-.9-.4-1.4-.4H1.3L1.2 11c-.2 1.2.1 2.7.9 3.8.8 1.1 2 1.6 3.5 1.6 3.3 0 5.7-1.5 6.9-4.2.4 0 1.4 0 1.9-1.1.1 0 .4-.1.4-.2l.2-.5z"/>' },
  { name: 'kubernetes', displayName: 'Kubernetes', category: 'devops', color: '#326CE5', description: 'Container orchestration. Deep-dive into OOMKilled pods, ingress controller routing errors, and persistent volume claim failures.', iconSvg: '<path d="M12 2L3.5 7v10L12 22l8.5-5V7L12 2zm0 2.5l6.5 3.8v7.4l-6.5 3.8-6.5-3.8V8.3L12 4.5z"/>' },
  { name: 'mongodb', displayName: 'MongoDB', category: 'database', color: '#47A248', description: 'NoSQL document database. Contains solutions for aggregation pipeline timeouts, replica set sync failures, and indexing strategies.', iconSvg: '<path d="M12 2C9.5 2 8 4.5 8 7.5c0 2.5 1.5 5.5 3.5 8C13 17 13.5 17.75 13.5 19c0 .8-.7 1.5-1.5 1.5S10.5 19.8 10.5 19c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5C7 20.5 8.5 22 10.5 22s3.5-1.5 3.5-3.5c0-1.5-.5-2.5-1.5-3.75-2-2.5-3.5-5.5-3.5-7.75C9 5.5 10.5 3 12 3s3 2.5 3 4.5z"/>' },
  { name: 'redis', displayName: 'Redis', category: 'database', color: '#DC382D', description: 'In-memory data store. How to handle cache stampedes, maxmemory-policy evictions, and connection pool exhaustion.', iconSvg: '<path d="M12 2L2 7v10l10 5 10-5V7l-10-5z"/>' },
  { name: 'typescript', displayName: 'TypeScript', category: 'language', color: '#3178C6', description: 'Strongly typed JavaScript. Explore deep-dives into complex generics, infinite type instantiation errors, and tsconfig mismatches.', iconSvg: '<path d="M2.1 2.1v19.8h19.8V2.1H2.1zm13.1 14.5c-1.3.9-3.2 1.5-5.1 1.5-3.5 0-5.6-2.1-5.6-5.4 0-3.3 2.1-5.4 5.6-5.4 1.8 0 3.6.5 4.8 1.4l-1.3 2c-.9-.6-2-1-3.2-1-2.1 0-3.3 1.2-3.3 3s1.2 3 3.3 3c1.2 0 2.5-.4 3.4-1v2z"/>' },
  { name: 'nextjs', displayName: 'Next.js', category: 'frontend', color: '#FFFFFF', description: 'React framework for production. Solutions for hydration mismatches, ISR cache invalidation bugs, and edge runtime limitations.', iconSvg: '<path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.052.54-.052.479 0 .558.019.683.155a466.83 466.83 0 0 1 2.895 4.361c1.558 2.362 3.687 5.587 4.734 7.171l1.9 2.878.096-.063a12.317 12.317 0 0 0 2.465-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.573 0z"/>' },
];

const users = [
  {
    username: 'prasanna',
    email: 'prasanna@devsolved.com',
    passwordHash: 'Password123!',
    displayName: 'Prasanna Kumar',
    bio: 'Full-stack developer from Bengaluru. Building Vidyari and mapping skill gaps. Documenting war stories with AWS, Node.js, and React.',
    location: 'Bengaluru, India',
    website: 'https://vidyari.com',
    techStack: ['React', 'Node.js', 'AWS S3', 'MongoDB', 'TypeScript'],
    reputation: 12400,
    isPro: true,
    badges: [
      { name: 'Top Solver', description: 'Ranked top 1% in May 2026', iconName: 'flame', tier: 'gold' },
      { name: '10k Reputation', description: 'Reached 10,000 community rep', iconName: 'zap', tier: 'blue' },
    ],
  },
  {
    username: 'priya_dev',
    email: 'priya@devsolved.com',
    passwordHash: 'Password123!',
    displayName: 'Priya Sharma',
    bio: 'Backend engineer specializing in distributed systems. Open source contributor.',
    location: 'Mumbai, India',
    reputation: 8900,
    isPro: false,
  },
  {
    username: 'alex_infra',
    email: 'alex@devsolved.com',
    passwordHash: 'Password123!',
    displayName: 'Alex Chen',
    bio: 'DevOps & SRE. Kubernetes, Terraform, incident responder by profession.',
    location: 'San Francisco, CA',
    reputation: 15200,
    isPro: true,
    badges: [
      { name: 'SRE Legend', description: 'Resolved 100+ incidents', iconName: 'shield', tier: 'gold' },
    ],
  },
];

const posts = [
  {
    title: 'Website taking exactly 20 seconds to load initially — stale DNS A-record',
    excerpt: 'Whenever I visited my deployed website for the first time, the browser would hang for exactly 20 seconds before downloading assets. Turned out to be a stale DNS A-record causing a TCP SYN timeout.',
    status: 'resolved',
    severity: 'high',
    tags: ['aws', 'nodejs'],
    coverImage: '/images/og-default.png',
    content: {
      symptom: 'Every new visitor to my site experienced a 20-second initial hang. The browser showed "Waiting for server response" then loaded instantly. DevTools showed a single stalled request at the top of the waterfall. The 20-second delay was suspiciously consistent — never 18s, never 22s — always exactly 20.',
      investigation: 'My first instinct was server cold starts. But CloudWatch showed the Lambda was warm. Then I suspected TTFB — but the request wasn\'t even reaching my server during the 20s window. This pointed to network-level: DNS or TCP.',
      rootCause: '# Root Cause\n\nThe stale DNS A-record was pointing to the old EC2 IP.\nThe OS TCP stack was sending SYN packets to the dead IP.\nDefault SYN timeout on Linux is 20 seconds before fallback.\nAfter 20s, the OS gave up and re-resolved DNS, hitting the new IP.\n\n# The real issue: CloudFront cache still served old DNS record\n# despite TTL being set to 60s in Route53.',
      resolution: 'Flushed CloudFront cache, set Route53 TTL to 30s on A records, and added a health check to auto-failover. Immediately resolved. Post-fix: implemented DNS TTL monitoring as part of deployment checklist.',
      resolutionSteps: [
        { title: 'Identified network-layer hang via Wireshark', body: 'Captured packets and saw SYN→[no response]→SYN→[no response] repeating for exactly 20s before a fresh DNS query was sent.' },
        { title: 'Traced to stale CloudFront DNS cache', body: 'Despite updating Route53, CloudFront edge nodes had the old TTL cached. The 60s TTL we set was being overridden by CloudFront\'s minimum 30s cache.' },
        { title: 'Flushed CloudFront and deployed fix', body: 'Used CloudFront invalidation API, reduced A-record TTL to 30s, added Route53 health checks with auto-failover. Problem immediately resolved.' },
      ],
    },
    upvotes: 1234,
    saves: 456,
    comments: 48,
    views: 18240,
  },
  {
    title: 'S3 Multipart Uploads failing silently on files over 5MB in Node.js',
    excerpt: 'Files under 5MB uploaded perfectly to S3, but anything larger would silently fail without throwing an error in our Node.js backend. No error, no warning — just a 0-byte file in S3.',
    status: 'resolved',
    severity: 'critical',
    tags: ['aws', 'nodejs'],
    coverImage: '/images/og-default.png',
    content: {
      symptom: 'Users uploading course materials to Vidyari reported their files "uploaded" (progress bar completed) but the content was missing. S3 console showed 0-byte objects. The bug was 100% silent — no error logs, no exception thrown, no failed promise.',
      investigation: 'Checked IAM permissions — s3:PutObject was granted. Added AWS SDK debug logging and found the multipart upload was being initiated but the CompleteMultipartUpload call was never made. The parts were uploaded but the S3 object was never assembled.',
      rootCause: '# Root Cause\n\nAWS SDK v3 for Node.js uses streams by default.\nOur Multer middleware was consuming the stream before the SDK.\nThe SDK received an empty/exhausted stream.\nMultipart upload initiated → 0 bytes sent per part → CompleteMultipart never called.\n\n# The SDK silently "succeeds" because no exception is thrown\n# when you upload empty parts — it just results in a 0-byte object.',
      resolution: 'Switched from stream-based upload to buffer-based upload using `Upload` from `@aws-sdk/lib-storage`. This handles chunking automatically and properly awaits the complete assembly.',
      resolutionSteps: [
        { title: 'Added detailed SDK logging to trace the lifecycle', body: 'Set AWS_NODEJS_CONNECTION_REUSE_ENABLED=1 and enabled debug logging. Found that CompleteMultipartUpload was never being called.' },
        { title: 'Discovered the stream exhaustion issue', body: 'Multer processes the stream into memory/disk, leaving the stream in a "consumed" state. When the AWS SDK tried to read it, it got 0 bytes.' },
        { title: 'Switched to buffer-based upload with @aws-sdk/lib-storage', body: 'Used `await upload.done()` from `@aws-sdk/lib-storage` which properly handles large file uploads with automatic part management.' },
      ],
    },
    upvotes: 854,
    saves: 312,
    comments: 22,
    views: 9840,
  },
  {
    title: 'PostgreSQL deadlock on concurrent upsert operations — the correct pattern',
    excerpt: 'Our leaderboard service was experiencing random deadlocks under load when two coroutines tried to upsert the same user score simultaneously. Took 3 days to find the exact fix.',
    status: 'resolved',
    severity: 'critical',
    tags: ['postgresql', 'nodejs'],
    coverImage: '/images/og-default.png',
    content: {
      symptom: 'Under load (>50 concurrent users), our leaderboard update service would throw `ERROR: deadlock detected` with a roughly 2% failure rate. The error was non-deterministic — it only happened under concurrent load.',
      investigation: 'Queried pg_stat_activity and pg_locks during load testing. Found two transactions waiting on each other\'s row locks. Both were running the same INSERT ... ON CONFLICT DO UPDATE pattern.',
      rootCause: '# Root Cause\n\nINSERT ... ON CONFLICT DO UPDATE acquires a Share lock on insert attempt,\nthen upgrades to an Exclusive lock on conflict resolution.\n\n# Two concurrent upserts for the same row:\n# T1: Share lock → detects conflict → waits for Exclusive\n# T2: Share lock → detects conflict → waits for Exclusive\n# Deadlock!\n\n# PostgreSQL docs mention this but in a footnote most people miss.',
      resolution: 'Wrapped upserts in an advisory lock using `pg_try_advisory_xact_lock(hash_text(userId))`. This serializes concurrent upserts for the same user without affecting performance for different users.',
      resolutionSteps: [
        { title: 'Reproduced deadlock in isolation', body: 'Used pgbench to simulate 100 concurrent upserts for the same user. Reproduced the deadlock within seconds.' },
        { title: 'Explored transaction isolation levels', body: 'Tried SERIALIZABLE isolation — reduced deadlocks but added ~40ms overhead. Not acceptable for our leaderboard use case.' },
        { title: 'Implemented advisory locks', body: 'Used pg_try_advisory_xact_lock with user ID hash. Zero deadlocks in 48 hours of load testing with no measurable performance overhead.' },
      ],
    },
    upvotes: 1102,
    saves: 523,
    comments: 67,
    views: 24100,
  },
  {
    title: 'React hydration mismatch destroying SEO — the server/client time discrepancy',
    excerpt: 'Our Next.js app was showing hydration warnings in production and Google was indexing the SSR-rendered content, not the client-rendered content. The root cause was rendering the current date inside a component.',
    status: 'resolved',
    severity: 'high',
    tags: ['react', 'nextjs'],
    coverImage: '/images/og-default.png',
    content: {
      symptom: 'Next.js console showed "Warning: Text content did not match. Server: \\"Jul 18\\" Client: \\"Jul 19\\"". This caused React to re-render the entire component tree on mount, destroying our Core Web Vitals scores.',
      rootCause: '# Root Cause\n\nnew Date() inside a component returns different values on server vs client.\nServer renders at request time (e.g. Jul 18, 23:59:59 UTC)\nClient hydrates at load time (e.g. Jul 19, 00:00:01 UTC)\n→ Mismatch → React throws away SSR output → re-renders everything\n\n# This was happening across timezone boundaries for ~15% of users.',
      resolution: 'Moved all date rendering to useEffect with useState, ensuring dates are only rendered client-side. Used suppressHydrationWarning as a last resort for unavoidable cases.',
    },
    upvotes: 678,
    saves: 289,
    comments: 34,
    views: 15620,
  },
  {
    title: 'Kubernetes pod OOMKilled every 6 hours — the Node.js heap snapshot approach',
    excerpt: 'Our API service pods were being OOMKilled on a predictable 6-hour cycle. Memory profiling was inconclusive until we captured a heap snapshot at the 5.5-hour mark.',
    status: 'resolved',
    severity: 'critical',
    tags: ['kubernetes', 'nodejs'],
    coverImage: '/images/og-default.png',
    content: {
      symptom: 'Pods would run fine for ~6 hours then get OOMKilled by Kubernetes. Memory limit was 512MB. Restarting the pod would reset the cycle. The leak was slow — ~1.4MB per minute.',
      rootCause: '# Root Cause\n\nAn event listener was being added to a global EventEmitter inside a request handler.\nEvery request added a new listener. The listeners were never removed.\nAfter 6 hours of traffic (req/s * 21600 seconds), the listener array grew to ~2GB.\n\n# node --max-old-space-size defaults to 512MB in our Kubernetes config\n# which is why OOMKill happened at exactly the heap limit.',
      resolution: 'Added emitter.setMaxListeners(0) to disable the MaxListenersExceededWarning that was masking the issue. Then rewrote the event listener pattern to use once() instead of on(), and cleaned up listeners in finally blocks.',
    },
    upvotes: 934,
    saves: 401,
    comments: 53,
    views: 19800,
  },
];

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // Clear existing data
  await Promise.all([Tag.deleteMany({}), User.deleteMany({}), Post.deleteMany({})]);
  console.log('🗑️  Cleared existing data');

  // Insert tags
  const tagDocs = await Tag.insertMany(tags);
  const tagMap = Object.fromEntries(tagDocs.map((t) => [t.name, t]));
  console.log(`✅ Inserted ${tagDocs.length} tags`);

  // Insert users
  const userDocs = [];
  for (const u of users) {
    const user = new User(u);
    await user.save();
    userDocs.push(user);
  }
  console.log(`✅ Inserted ${userDocs.length} users`);

  // Insert posts
  const createdPosts = [];
  for (const p of posts) {
    const resolvedTagIds = p.tags.map((name) => tagMap[name]?._id).filter(Boolean);
    const post = new Post({
      ...p,
      tags: resolvedTagIds,
      tagNames: p.tags,
      author: userDocs[Math.floor(Math.random() * userDocs.length)]._id,
      globalScore: Math.random() * 50 + 10,
      publishedAt: new Date(),
    });
    await post.save();
    createdPosts.push(post);
  }
  console.log(`✅ Inserted ${createdPosts.length} posts`);

  // Update tag incident counts
  for (const tagName of Object.keys(tagMap)) {
    const count = await Post.countDocuments({ tagNames: tagName });
    await Tag.updateOne({ name: tagName }, { $set: { incidentCount: count, weeklyCount: count } });
  }
  console.log('✅ Updated tag counts');

  console.log('');
  console.log('🌱 Seed complete! Open http://localhost:3000 to see DevSolved.');
  console.log('   Login with: prasanna@devsolved.com / Password123!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
