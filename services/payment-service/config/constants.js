module.exports = {
  PORT: process.env.PORT || 3005,
  VIETQR_API_URL: process.env.VIETQR_API_URL || 'https://api.vietqr.io/v2/generate',
  VIETQR_CLIENT_ID: process.env.VIETQR_CLIENT_ID,
  VIETQR_API_KEY: process.env.VIETQR_API_KEY,
  VIETQR_BANK_BIN: process.env.VIETQR_BANK_BIN || '970436',
  VIETQR_BANK_ACCOUNT: process.env.VIETQR_BANK_ACCOUNT || '1858611282',
  VIETQR_ACCOUNT_NAME: process.env.VIETQR_ACCOUNT_NAME || 'NGUYEN TUAN HUNG',
  QR_EXPIRE_MINUTES: parseInt(process.env.QR_EXPIRE_MINUTES || '15', 10),
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'dev_webhook_secret',
  PAYMENT_WEBHOOK_SIGNING_SECRET:
    process.env.PAYMENT_WEBHOOK_SIGNING_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || 'dev_webhook_secret',
  PAYMENT_WEBHOOK_TOLERANCE_SECONDS: parseInt(process.env.PAYMENT_WEBHOOK_TOLERANCE_SECONDS || '300', 10),
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || 'http://order-service:3003',
  ORDER_INTERNAL_SECRET: process.env.ORDER_INTERNAL_SECRET || 'order_internal_secret_dev',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
};
