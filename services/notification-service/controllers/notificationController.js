const pool = require('../db');
const { handleError } = require('../middleware/errorHandler');

const getNotificationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return handleError(error, res);
  }
};

const getEmailLogs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100');
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return handleError(error, res);
  }
};

const createNotification = async (req, res) => {
  try {
    const { user_id, title, content } = req.body;

    if (!user_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'user_id, title, and content are required',
      });
    }

    const result = await pool.query(
      'INSERT INTO notifications (user_id, title, content, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [user_id, title, content]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Notification created successfully',
    });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  getNotificationsByUser,
  getEmailLogs,
  createNotification,
};
