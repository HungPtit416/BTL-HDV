const { handleError } = require('../middleware/errorHandler');
const {
  toPositiveNumber,
  listPaymentsByUser,
  getPaymentByIdAndUser,
  getPaymentsByOrderAndUser,
  createQrPayment,
  createCashPayment,
  confirmPaymentPaid,
  cancelPayment,
  processWebhook,
} = require('../services/paymentService');

const getAllPayments = async (req, res) => {
  try {
    const rows = await listPaymentsByUser(req.user.id);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return handleError(error, res);
  }
};

const getPaymentById = async (req, res) => {
  try {
    const row = await getPaymentByIdAndUser(req.params.id, req.user.id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    return res.json({ success: true, data: row });
  } catch (error) {
    return handleError(error, res);
  }
};

const getPaymentsByOrder = async (req, res) => {
  try {
    const rows = await getPaymentsByOrderAndUser(req.params.orderId, req.user.id);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return handleError(error, res);
  }
};

const generateQrPayment = async (req, res) => {
  try {
    const { order_id, user_id, total_amount, description } = req.body;
    const amount = toPositiveNumber(total_amount);

    if (!order_id || !user_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'order_id, user_id and valid total_amount are required',
      });
    }

    if (Number(user_id) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'You are not allowed to create payment for another user',
      });
    }

    const { payment, qr } = await createQrPayment({
      orderId: order_id,
      userId: user_id,
      amount,
      description,
      userEmail: req.user.email || null,
    });

    return res.status(201).json({
      success: true,
      data: payment,
      qr,
      message: 'Payment QR generated successfully',
    });
  } catch (error) {
    return handleError(error, res, error.status || 500);
  }
};

const createCash = async (req, res) => {
  try {
    const { order_id, user_id, total_amount, description } = req.body;
    const amount = toPositiveNumber(total_amount);

    if (!order_id || !user_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'order_id, user_id and valid total_amount are required',
      });
    }

    if (Number(user_id) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'You are not allowed to create payment for another user',
      });
    }

    const payment = await createCashPayment({
      orderId: order_id,
      userId: user_id,
      amount,
      description,
      userEmail: req.user.email || null,
    });

    return res.status(201).json({
      success: true,
      data: payment,
      message: 'Cash payment created successfully',
    });
  } catch (error) {
    return handleError(error, res);
  }
};

const confirmPayment = async (req, res) => {
  try {
    const updated = await confirmPaymentPaid({
      paymentId: req.params.id,
      userId: req.user.id,
      transactionId: req.body.transaction_id,
      userEmail: req.user.email,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    return res.json({ success: true, data: updated, message: 'Payment confirmed successfully' });
  } catch (error) {
    return handleError(error, res);
  }
};

const cancelPaymentById = async (req, res) => {
  try {
    const updated = await cancelPayment({
      paymentId: req.params.id,
      userId: req.user.id,
      reason: req.body.reason,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    return res.json({ success: true, data: updated, message: 'Payment cancelled successfully' });
  } catch (error) {
    return handleError(error, res);
  }
};

const vietqrWebhook = async (req, res) => {
  try {
    const result = await processWebhook({
      headers: req.headers,
      body: req.body,
      rawBody: req.rawBody || '',
    });

    if (result.duplicate) {
      return res.json({
        success: true,
        message: 'Duplicate webhook event ignored',
        data: result.data,
      });
    }

    if (result.ignored) {
      return res.json({
        success: true,
        message: 'Webhook received but payment status is not successful, ignored',
      });
    }

    return res.json({
      success: true,
      message: 'Payment updated by webhook successfully',
      data: result.payment,
    });
  } catch (error) {
    return handleError(error, res, error.status || 500);
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  getPaymentsByOrder,
  generateQrPayment,
  createCash,
  confirmPayment,
  cancelPaymentById,
  vietqrWebhook,
};
