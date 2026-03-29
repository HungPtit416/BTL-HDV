const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3005;

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
  res.json({ status: 'Payment Service is running' });
});

// Get all payments
app.get('/api/payments', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, order_id, user_id, method, amount, status, created_at FROM payments LIMIT 50'
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Get payment by ID
app.get('/api/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
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

// Create payment
app.post('/api/payments', async (req, res) => {
  try {
    const { order_id, user_id, method, amount } = req.body;

    if (!order_id || !user_id || !method || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'order_id, user_id, method, and valid amount are required'
      });
    }

    const result = await pool.query(
      'INSERT INTO payments (order_id, user_id, method, amount, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [order_id, user_id, method, amount, 'PENDING']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Payment created successfully'
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Process payment
app.post('/api/payments/:id/process', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['COMPLETED', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Payment processed successfully'
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('SERVER ERROR LOG:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(` Payment Service running on http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
});
