const { INTERNAL_EVENT_SECRET } = require('../config/constants');

const protectInternal = (req, res, next) => {
  const provided = req.headers['x-internal-secret'];
  if (!provided || provided !== INTERNAL_EVENT_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized internal request',
    });
  }

  return next();
};

module.exports = {
  protectInternal,
};
