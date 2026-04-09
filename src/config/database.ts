import mongoose from 'mongoose';
import dotenv from 'dotenv';

export async function connectDB() {
  try {
    // Force immediate parsing to defeat module hoisting
    dotenv.config({ path: '.env.local' });
    dotenv.config(); // fallback
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/secondBrain';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ MongoDB disconnection failed:', error);
    process.exit(1);
  }
}
