module.exports = {
  PORT: process.env.PORT || 3003,
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002',
  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005',
  ORDER_AUTO_CANCEL_MINUTES: Number(process.env.ORDER_AUTO_CANCEL_MINUTES || 2),
  ORDER_AUTO_CANCEL_INTERVAL_SECONDS: Number(process.env.ORDER_AUTO_CANCEL_INTERVAL_SECONDS || 60),
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  ORDER_INTERNAL_SECRET: process.env.ORDER_INTERNAL_SECRET || 'order_internal_secret_dev',
};
