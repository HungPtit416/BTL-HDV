const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Routes
const userRoutes = require('./routes/userRoutes');
const articleRoutes = require('./routes/articleRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- CẦU NỐI VỚI API GATEWAY ---
// Middleware này nhặt các Header x-user-* và gán vào req.user
app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  const userEmail = req.headers['x-user-email'];

  if (userId) {
    req.user = {
      id: Number(userId), // Quan trọng: ép kiểu Number để khớp với ID trong DB
      role: userRole,
      email: userEmail
    };
  }
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'User Service OK' }));

// Gắn các Routes
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Error Handling
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Lỗi hệ thống nội bộ'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 User Service running on port ${PORT}`);
});