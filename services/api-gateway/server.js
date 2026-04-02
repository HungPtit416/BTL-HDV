const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3006);

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005';

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'API Gateway is running',
    timestamp: new Date().toISOString(),
  });
});

const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  logLevel: 'warn',
  proxyTimeout: 15000,
  timeout: 15000,
});

app.use('/api/users', createProxyMiddleware(proxyOptions(USER_SERVICE_URL)));
app.use('/api/articles', createProxyMiddleware(proxyOptions(USER_SERVICE_URL)));
app.use('/api/wishlist', createProxyMiddleware(proxyOptions(USER_SERVICE_URL)));

app.use('/api/products', createProxyMiddleware(proxyOptions(PRODUCT_SERVICE_URL)));
app.use('/api/brands', createProxyMiddleware(proxyOptions(PRODUCT_SERVICE_URL)));
app.use('/api/categories', createProxyMiddleware(proxyOptions(PRODUCT_SERVICE_URL)));

app.use('/api/orders', createProxyMiddleware(proxyOptions(ORDER_SERVICE_URL)));
app.use('/api/carts', createProxyMiddleware(proxyOptions(ORDER_SERVICE_URL)));
app.use('/api/cart', createProxyMiddleware(proxyOptions(ORDER_SERVICE_URL)));

app.use('/api/payments', createProxyMiddleware(proxyOptions(PAYMENT_SERVICE_URL)));
app.use('/api/events', createProxyMiddleware(proxyOptions(PAYMENT_SERVICE_URL)));

app.use('/api/notifications', createProxyMiddleware(proxyOptions(NOTIFICATION_SERVICE_URL)));

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Gateway route not found',
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
