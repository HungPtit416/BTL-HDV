const express = require('express');
const { vietqrWebhook } = require('../controllers/paymentController');

const router = express.Router();

router.post('/payments/webhook/vietqr', vietqrWebhook);

module.exports = router;
