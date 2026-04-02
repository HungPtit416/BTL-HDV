const express = require('express');
const { orderCreatedEvent, orderCancelledEvent, vnpayReturn, vnpayIpn } = require('../controllers/paymentController');
const { protectInternal } = require('../middleware/internalAuth');

const router = express.Router();

router.post('/events/order-created', protectInternal, orderCreatedEvent);
router.post('/events/order-cancelled', protectInternal, orderCancelledEvent);
router.get('/payments/vnpay-return', vnpayReturn);
router.get('/payments/vnpay-ipn', vnpayIpn);

module.exports = router;
