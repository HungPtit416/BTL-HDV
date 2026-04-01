const express = require('express');
const { orderCreatedEvent, vnpayReturn, vnpayIpn } = require('../controllers/paymentController');
const { protectInternal } = require('../middleware/internalAuth');

const router = express.Router();

router.post('/events/order-created', protectInternal, orderCreatedEvent);
router.get('/payments/vnpay-return', vnpayReturn);
router.get('/payments/vnpay-ipn', vnpayIpn);

module.exports = router;
