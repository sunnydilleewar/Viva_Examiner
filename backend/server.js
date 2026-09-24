require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database/db');
const apiRoutes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api', apiRoutes);

// Fallback for unmatched API routes
app.use('/api', notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

// Start server after initializing SQLite
async function startServer() {
  try {
    await initDatabase();
    const server = app.listen(PORT, () => {
      console.log(`[Server] AI Viva Examiner backend running on http://localhost:${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });
    return server;
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
