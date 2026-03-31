// Error handling middleware

const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
