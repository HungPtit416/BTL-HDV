const express = require('express');
const {
  getNotificationsByUser,
  getEmailLogs,
  createNotification,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/notifications/:userId', getNotificationsByUser);
router.get('/emails', getEmailLogs);
router.post('/notifications', createNotification);

module.exports = router;
