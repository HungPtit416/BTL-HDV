const express = require('express');
const { protectInternal } = require('../middleware/internalAuth');
const { updateOrderPaymentStatus, getOrderInternal } = require('../controllers/internalController');

const router = express.Router();

router.patch('/orders/:id/payment-status', protectInternal, updateOrderPaymentStatus);
router.get('/orders/:id', protectInternal, getOrderInternal);

module.exports = router;
