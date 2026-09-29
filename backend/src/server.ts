// =============================================================================
// PrintShop Management System — Express Server Entrypoint
// =============================================================================
// Architectural Overview:
// Bootstraps the backend REST API application following a layered clean architecture:
//   Client (Angular 22 SPA)
//       ↓ [HTTP / JSON over CORS]
//   Express Application (server.ts)
//       ↓ [Global Middleware: CORS, JSON parser, urlencoded]
//   Route Layer (routes/v1/*.routes.ts)
//       ↓ [Authentication & Validation Middleware]
//   Controller Layer (controllers/*.controller.ts)
//       ↓ [DTO extraction, HTTP status codes]
//   Service Layer (services/*.service.ts)
//       ↓ [Core Business Logic, authorization checks, workflow transitions]
//   Data Layer (Supabase PostgreSQL / Storage)
// =============================================================================

import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import router from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { initDatabase } from './config/database';
import logger from './utils/logger';

// Load environment variables first
dotenv.config();

const app: Application = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(cors({
  origin:      process.env.FRONTEND_URL ?? 'http://localhost:4200',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use(router);

// ─── Error Handling (must be last) ───────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  logger.info('─────────────────────────────────────────');
  logger.info('🖨️  PrintShop Management System API');
  logger.info(`🚀 Server       → http://localhost:${PORT}`);
  logger.info(`🌍 Environment  → ${process.env.NODE_ENV ?? 'development'}`);
  logger.info(`📡 API Base     → http://localhost:${PORT}/api/v1`);
  logger.info(`❤️  Health       → http://localhost:${PORT}/api/v1/health`);
  logger.info('─────────────────────────────────────────');
  await initDatabase();
});

export default app;
