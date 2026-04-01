const express = require('express');
const { checkout, getOrders, getOrderById } = require('../controllers/orderController');

const router = express.Router();

router.post('/orders/checkout', checkout);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);

module.exports = router;
