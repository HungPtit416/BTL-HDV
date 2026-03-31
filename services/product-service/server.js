const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const productRoutes = require('./routers/productRoutes');
const brandRoutes = require('./routers/brandRoutes');
const categoryRoutes = require('./routers/categoryRoutes');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Product Service is running' });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Database connection check
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('Connected to database successfully');
    release();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
});
