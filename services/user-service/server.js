const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

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
  res.json({ status: 'User Service is running' });
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users LIMIT 10');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, name, email, phone FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
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

// Create user (Register)
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // TODO: Hash password with bcryptjs
    const result = await pool.query(
      'INSERT INTO users (name, email, password, phone, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email',
      [name, email, password, phone]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'User registered successfully'
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Login
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // TODO: Compare password with bcryptjs
    // TODO: Generate JWT token
    
    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name
      },
      message: 'Login successful'
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
  console.log(`User Service running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
