const express = require('express');
const {
  getAllPayments,
  getPaymentById,
  getPaymentsByOrder,
  generateQrPayment,
  createCash,
  confirmPayment,
  cancelPaymentById,
} = require('../controllers/paymentController');

const router = express.Router();

router.get('/payments', getAllPayments);
router.get('/payments/:id', getPaymentById);
router.get('/payments/order/:orderId', getPaymentsByOrder);
router.post('/payments/qr', generateQrPayment);
router.post('/payments/cash', createCash);
router.post('/payments/:id/confirm', confirmPayment);
router.post('/payments/:id/cancel', cancelPaymentById);

module.exports = router;
