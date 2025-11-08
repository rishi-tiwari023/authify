import express from 'express';
import { initializeDatabase } from './config/data-source';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { errorHandler } from './utils/errors';
import { corsMiddleware } from './middleware/corsMiddleware';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

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


