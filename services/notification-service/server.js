const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3004;

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
  res.json({ status: 'Notification Service is running' });
});

// Get all notifications for user
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Get email logs
app.get('/api/emails', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100'
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    handleError(error, res);
  }
});

// Send notification
app.post('/api/notifications', async (req, res) => {
  try {
    const { user_id, title, content } = req.body;

    if (!user_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'user_id, title, and content are required'
      });
    }

    const result = await pool.query(
      'INSERT INTO notifications (user_id, title, content, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [user_id, title, content]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Notification created successfully'
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
  console.log(` Notification Service running on http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
});
