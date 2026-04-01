const handleError = (error, res, statusCode = 500) => {
  console.error('Order service error:', {
    message: error.message,
    code: error.code,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  const errorMessage = error.code === 'ENOTFOUND' || String(error.message || '').includes('EAI_AGAIN')
    ? 'Upstream service/database connection error. Please try again.'
    : error.message;

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  });
};

const errorMiddleware = (err, req, res, next) => {
  console.error('SERVER ERROR LOG:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
};

module.exports = {
  handleError,
  errorMiddleware,
};
