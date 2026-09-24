/**
 * 404 Not Found Middleware
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
}

/**
 * Global Error Handling Middleware
 * Ensures internal errors and credentials are never leaked
 */
function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  console.error(`[Error] [${req.method} ${req.originalUrl}] ${statusCode} - ${err.message || 'Error'}`);

  res.status(statusCode).json({
    success: false,
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
