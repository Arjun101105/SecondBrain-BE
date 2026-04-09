import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import contentRoutes from './routes/content';
import collectionRoutes from './routes/collections';
import userRoutes from './routes/users';
import brainRoutes from './routes/brain';

const app = express();

// Middleware — CORS must run before helmet to prevent header conflicts
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
connectDB().catch((error) => {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    statusCode: 200,
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/collections', collectionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/brain', brainRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    statusCode: 404,
  });
});

// Error handler middleware
app.use(errorHandler);

export default app;
