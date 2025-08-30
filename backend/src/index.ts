#!/usr/bin/env node

/**
 * PWA Push Notification SaaS Platform
 * Backend API Server Entry Point
 * 
 * This file serves as the main entry point for the Node.js/Express backend API.
 * It imports and starts the Express application with all configured middleware,
 * routes, and database connections.
 */

import { startServer } from './app';
import { logger } from './utils/logger';

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start the server:', error);
  process.exit(1);
});