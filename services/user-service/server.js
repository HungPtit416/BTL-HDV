const express = require('express');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const articleRoutes = require('./routes/articleRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({
  status: 'User Service is running',
  timestamp: new Date().toISOString()
}));

app.use('/api/users', userRoutes);      // Auth, Profile
app.use('/api/articles', articleRoutes); // Tin tức, bài viết
app.use('/api/wishlist', wishlistRoutes); // Yêu thích

app.use((err, req, res, next) => {
  console.error('SERVER ERROR LOG:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(` User Service running on http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
});