const { ORDER_INTERNAL_SECRET } = require('../config/constants');

const protectInternal = (req, res, next) => {
  const internalSecret = req.headers['x-internal-secret'];
  if (!internalSecret || internalSecret !== ORDER_INTERNAL_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'Invalid internal secret',
    });
  }

  return next();
};

module.exports = {
  protectInternal,
};
