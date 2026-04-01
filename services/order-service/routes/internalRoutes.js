const express = require('express');
const { protectInternal } = require('../middleware/internalAuth');
const { updateOrderPaymentStatus } = require('../controllers/internalController');

const router = express.Router();

router.patch('/orders/:id/payment-status', protectInternal, updateOrderPaymentStatus);

module.exports = router;
