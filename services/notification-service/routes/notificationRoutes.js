const express = require('express');
const {
  getEmailLogs,
  handlePaymentSuccessEvent,
} = require('../controllers/notificationController');
const { protectInternal } = require('../middleware/internalAuth');

const router = express.Router();

router.get('/emails', getEmailLogs);
router.post('/events/payment-success', protectInternal, handlePaymentSuccessEvent);

module.exports = router;
