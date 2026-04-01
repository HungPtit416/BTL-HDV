const express = require('express');
const {
  getNotificationsByUser,
  getEmailLogs,
  createNotification,
  handlePaymentSuccessEvent,
} = require('../controllers/notificationController');
const { protectInternal } = require('../middleware/internalAuth');

const router = express.Router();

router.get('/notifications/:userId', getNotificationsByUser);
router.get('/emails', getEmailLogs);
router.post('/notifications', createNotification);
router.post('/events/payment-success', protectInternal, handlePaymentSuccessEvent);

module.exports = router;
