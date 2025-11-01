import express from 'express';
import { initializeDatabase } from './config/data-source';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

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


