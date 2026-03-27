const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3003;

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
  res.json({ status: 'Order Service is running' });
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, total_amount, status, created_at FROM orders LIMIT 20'
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Get cart by user ID
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM carts WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          user_id: userId,
          items: [],
          total: 0
        }
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

// Add item to cart
app.post('/api/cart/add', async (req, res) => {
  try {
    const { user_id, product_id, quantity, price } = req.body;

    if (!user_id || !product_id || !quantity || !price) {
      return res.status(400).json({
        success: false,
        error: 'user_id, product_id, quantity, and price are required'
      });
    }

    // Check if cart exists, if not create one
    let cartResult = await pool.query('SELECT * FROM carts WHERE user_id = $1', [user_id]);
    
    if (cartResult.rows.length === 0) {
      await pool.query('INSERT INTO carts (user_id, items, total, created_at) VALUES ($1, $2, $3, NOW())', 
        [user_id, JSON.stringify([]), 0]
      );
    }

    // Add item to cart (simplified)
    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: {
        user_id,
        product_id,
        quantity,
        price
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create order / Checkout
app.post('/api/orders/checkout', async (req, res) => {
  try {
    const { user_id, items, total_amount, payment_method } = req.body;

    if (!user_id || !items || items.length === 0 || !total_amount) {
      return res.status(400).json({
        success: false,
        error: 'user_id, items, and total_amount are required'
      });
    }

    // Calculate VAT (10%)
    const vat = total_amount * 0.1;
    const final_total = total_amount + vat;

    // Create order
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total_amount, vat_amount, final_total, payment_method, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
      [user_id, total_amount, vat, final_total, payment_method || 'PENDING', 'PENDING']
    );

    const order_id = orderResult.rows[0].id;

    // Add order items
    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [order_id, item.product_id, item.quantity, item.price]
      );

      // Call Product Service to deduct inventory
      try {
        await axios.patch(
          `${process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002'}/api/products/${item.product_id}/quantity`,
          { quantity_change: -item.quantity }
        );
      } catch (err) {
        console.error('Failed to update inventory:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      data: orderResult.rows[0],
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
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
  console.log(`Order Service running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
