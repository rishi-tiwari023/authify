import { initializeDatabase } from './config/data-source';

async function bootstrap() {
  await initializeDatabase();
  // Placeholder: app/server will be added later
  // This ensures DB connects when running `npm run dev`
  console.log('Database initialized');
}

bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});


