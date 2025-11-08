import express from 'express';
import { initializeDatabase, AppDataSource } from './config/data-source';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { errorHandler } from './utils/errors';
import { corsMiddleware } from './middleware/corsMiddleware';
import { loggerMiddleware } from './middleware/loggerMiddleware';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const dbStatus = AppDataSource.isInitialized ? 'connected' : 'disconnected';
    res.status(200).json({
      status: 'ok',
      message: 'Server is running',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      database: 'error',
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

async function bootstrap() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('✅ Database connected');
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application', err);
  process.exit(1);
});


