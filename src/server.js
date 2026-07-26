import './env.js';
import app from './app.js';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { startScoreWorker } from './workers/scoreWorker.js';

const PORT = process.env.PORT || 3000;

const start = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Connect to Redis (graceful — won't crash if unavailable)
  await connectRedis();

  // 3. Start the feed score worker (cron every 5 min)
  startScoreWorker();

  // 4. Start HTTP server
  app.listen(PORT, () => {
    console.log('');
    console.log('  ██████╗ ███████╗██╗   ██╗███████╗ ██████╗ ██╗   ██╗   ██╗███████╗██████╗');
    console.log('  ██╔══██╗██╔════╝██║   ██║██╔════╝██╔═══██╗██║   ██║   ██║██╔════╝██╔══██╗');
    console.log('  ██║  ██║█████╗  ██║   ██║███████╗██║   ██║██║   ██║   ██║█████╗  ██║  ██║');
    console.log('  ██║  ██║██╔══╝  ╚██╗ ██╔╝╚════██║██║   ██║██║   ╚██╗ ██╔╝██╔══╝  ██║  ██║');
    console.log('  ██████╔╝███████╗ ╚████╔╝ ███████║╚██████╔╝███████╗╚████╔╝ ███████╗██████╔╝');
    console.log('  ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝ ╚═════╝ ╚══════╝ ╚═══╝  ╚══════╝╚═════╝');
    console.log('');
    console.log(`  🚀 DevSolved running at  http://localhost:${PORT}`);
    console.log(`  📊 MongoDB Compass        mongodb://127.0.0.1:27017/devsolved`);
    console.log(`  🌱 Seed data              npm run seed`);
    console.log('');
  });
};

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
