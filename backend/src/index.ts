import express from 'express';
import path from 'path';
import fs from 'fs';
import { initializeDatabase, AppDataSource } from './config/data-source';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler } from './utils/errors';
import { corsMiddleware } from './middleware/corsMiddleware';
import { loggerMiddleware } from './middleware/loggerMiddleware';
import { securityHeadersMiddleware } from './middleware/securityHeaders';
import { TokenCleanupService } from './service/TokenCleanupService';
import { sanitizationMiddleware } from './middleware/sanitizationMiddleware';

const app = express();
const PORT = process.env.PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(securityHeadersMiddleware);
app.use(express.json());
app.use(sanitizationMiddleware);
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Serve OpenAPI documentation
const openApiCandidatePaths = [
  // When running via ts-node-dev from backend directory
  path.resolve(__dirname, 'docs', 'openapi.json'),
  // When running compiled JS from dist with docs copied alongside src structure
  path.resolve(__dirname, 'src', 'docs', 'openapi.json'),
  // Fallbacks when running from monorepo root
  path.resolve(process.cwd(), 'backend', 'src', 'docs', 'openapi.json'),
  path.resolve(process.cwd(), 'src', 'docs', 'openapi.json'),
];

let cachedOpenApi: unknown | null = null;

app.get('/api/docs/openapi.json', (_req, res) => {
  try {
    if (!cachedOpenApi) {
      const openApiPath =
        openApiCandidatePaths.find((p) => fs.existsSync(p)) ||
        openApiCandidatePaths[0];

      const raw = fs.readFileSync(openApiPath, 'utf-8');
      cachedOpenApi = JSON.parse(raw);
    }
    res.json(cachedOpenApi);
  } catch (error) {
    console.error('Failed to load OpenAPI document', error);
    res.status(500).json({ error: 'Failed to load API documentation' });
  }
});

app.get('/health', async (_req, res) => {
  try {
    const dbStatus = AppDataSource.isInitialized ? 'connected' : 'disconnected';

    const serviceInfo = {
      status: 'ok',
      message: 'Server is running',
      version: APP_VERSION,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({
      ...serviceInfo,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      database: 'error',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

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

  // Start token cleanup service
  const tokenCleanupService = new TokenCleanupService();
  tokenCleanupService.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    tokenCleanupService.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    tokenCleanupService.stop();
    process.exit(0);
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Database connected');
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});


