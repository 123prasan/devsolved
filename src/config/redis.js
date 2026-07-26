import Redis from 'ioredis';

let redisClient = null;
let redisAvailable = false;

// Graceful Redis — if Redis isn't running locally, we degrade gracefully
// instead of crashing the app. Feed personalization simply won't be active.
const createRedisClient = () => {
  const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 2) return null; // Stop retrying after 2 attempts
      return 1000;
    },
  });

  client.on('connect', () => {
    redisAvailable = true;
    console.log('✅ Redis Connected: Shadow Graph & Dwell Tracking active');
  });

  client.on('error', (err) => {
    if (redisAvailable) {
      redisAvailable = false;
      console.warn('⚠️  Redis disconnected. Falling back to anonymous feed for all users.');
    }
  });

  return client;
};

export const getRedis = () => {
  if (!redisClient) redisClient = createRedisClient();
  return redisClient;
};

export const isRedisAvailable = () => redisAvailable;

export const connectRedis = async () => {
  const client = getRedis();
  try {
    await client.connect();
  } catch (err) {
    console.warn('⚠️  Redis not available. Install Redis for full personalization features.');
    console.warn('   Feed will still work perfectly for anonymous users.');
  }
};
