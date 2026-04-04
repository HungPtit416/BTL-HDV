const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3006);
const JWT_SECRET = process.env.JWT_SECRET;

// 1. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Tăng lên một chút để tránh chặn nhầm người dùng thật
  message: { success: false, error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }
});

app.use(limiter);
app.use(cors());
app.use(express.json());

// 2. Middleware xác thực (Protect)
const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      // Lưu thông tin để dùng cho hàm authorize ngay sau đó
      req.user = decoded;

      // Chèn thông tin vào Header để User Service nhận diện req.user.id
      // (Bởi vì trong controller của bạn đang dùng: req.user?.id)
      req.headers['x-user-id'] = String(decoded.id);
      req.headers['x-user-role'] = decoded.role;
      req.headers['x-user-email'] = decoded.email;

      return next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Phiên đăng nhập hết hạn' });
    }
  }
  res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để thực hiện' });
};

// 3. Middleware phân quyền (Authorize)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập' });
    }
    next();
  };
};

// 4. Proxy Options
const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    // Đẩy thông tin user vào header khi proxy gọi sang service con
    if (req.user) {
      proxyReq.setHeader('x-user-id', req.user.id);
      proxyReq.setHeader('x-user-role', req.user.role);
    }
  }
});

// --- CẤU HÌNH ROUTES ---

// A. USER SERVICE - NHÓM CÔNG KHAI (Public)
// Không dùng middleware 'protect' ở đây để login/register không bị chặn
app.use('/api/users/login', createProxyMiddleware(proxyOptions(process.env.USER_SERVICE_URL)));
app.use('/api/users/register', createProxyMiddleware(proxyOptions(process.env.USER_SERVICE_URL)));
app.use('/api/users/forgotpassword', createProxyMiddleware(proxyOptions(process.env.USER_SERVICE_URL)));
app.use('/api/users/resetpassword', createProxyMiddleware(proxyOptions(process.env.USER_SERVICE_URL)));

// B. USER SERVICE - NHÓM BẢO MẬT (Private)
// Các route về địa chỉ (address) và thông tin cá nhân
app.use('/api/users/addresses', protect, createProxyMiddleware(proxyOptions(process.env.USER_SERVICE_URL)));
app.use('/api/users/me', protect, createProxyMiddleware(proxyOptions(process.env.USER_SERVICE_URL)));

// C. USER SERVICE - NHÓM ADMIN
// Chỉ admin mới được lấy danh sách tất cả người dùng (getUsers)
app.use('/api/users/all', protect, authorize('admin'), createProxyMiddleware(proxyOptions(process.env.USER_SERVICE_URL)));

// D. CÁC SERVICE KHÁC
app.use('/api/products', createProxyMiddleware(proxyOptions(process.env.PRODUCT_SERVICE_URL))); // Công khai
app.use('/api/orders', protect, createProxyMiddleware(proxyOptions(process.env.ORDER_SERVICE_URL))); // Bảo mật

// Health check & 404
app.get('/health', (req, res) => res.json({ status: 'API Gateway is Healthy' }));
app.use((req, res) => res.status(404).json({ success: false, error: 'Route không tồn tại' }));

app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));