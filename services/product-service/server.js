const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Error logging helper
const handleError = (error, res, statusCode = 500) => {
  console.error('Error:', {
    message: error.message,
    code: error.code,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  const errorMessage = error.code === 'ENOTFOUND' || error.message.includes('EAI_AGAIN') 
    ? 'Database connection error. Please try again.'
    : error.message;
  
  res.status(statusCode).json({
    success: false,
    error: errorMessage
  });
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Product Service is running' });
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, price, quantity FROM products LIMIT 20'
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, quantity, category_id, brand_id } = req.body;

    if (!name || !price || price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Name and valid price are required'
      });
    }

    const result = await pool.query(
      'INSERT INTO products (name, description, price, quantity, category_id, brand_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
      [name, description, price, quantity || 0, category_id, brand_id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Product created successfully'
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Update product quantity (for inventory)
app.patch('/api/products/:id/quantity', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity_change } = req.body;

    if (quantity_change === undefined) {
      return res.status(400).json({
        success: false,
        error: 'quantity_change is required'
      });
    }

    const result = await pool.query(
      'UPDATE products SET quantity = quantity + $1 WHERE id = $2 RETURNING *',
      [quantity_change, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Quantity updated successfully'
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM categories');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Product Service running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
