import mongoose from 'mongoose';
import dns from 'dns'

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devsolved2', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host} → DB: ${conn.connection.name}`);
  } catch (err) {
    console.error(`❌ MongoDB Connection Failed: ${err.message}`);
    console.error('   Make sure MongoDB is running. Open MongoDB Compass and connect to mongodb://127.0.0.1:27017');
    process.exit(1);
  }
};

export default connectDB;
