const express = require('express');
const { checkout, getOrders, getOrderById, cancelOrder } = require('../controllers/orderController');

const router = express.Router();

router.post('/orders/checkout', checkout);
router.get('/orders', getOrders);
router.post('/orders/:id/cancel', cancelOrder);
router.get('/orders/:id', getOrderById);

module.exports = router;
