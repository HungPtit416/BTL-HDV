module.exports = {
  PORT: process.env.PORT || 3005,
  VNPAY_PAYMENT_URL:
    process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  VNPAY_RETURN_URL:
    process.env.VNPAY_RETURN_URL || 'http://localhost:3005/api/payments/vnpay-return',
  VNPAY_TMN_CODE: process.env.VNPAY_TMN_CODE || '',
  VNPAY_HASH_SECRET: process.env.VNPAY_HASH_SECRET || '',
  VNPAY_VERSION: process.env.VNPAY_VERSION || '2.1.0',
  VNPAY_COMMAND: process.env.VNPAY_COMMAND || 'pay',
  VNPAY_CURR_CODE: process.env.VNPAY_CURR_CODE || 'VND',
  VNPAY_LOCALE: process.env.VNPAY_LOCALE || 'vn',
  VNPAY_ORDER_TYPE: process.env.VNPAY_ORDER_TYPE || 'other',
  VNPAY_IP_ADDR_FALLBACK: process.env.VNPAY_IP_ADDR_FALLBACK || '127.0.0.1',
  INTERNAL_EVENT_SECRET: process.env.INTERNAL_EVENT_SECRET || 'order_internal_secret_dev',
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || 'http://order-service:3003',
  ORDER_INTERNAL_SECRET: process.env.ORDER_INTERNAL_SECRET || 'order_internal_secret_dev',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
};
