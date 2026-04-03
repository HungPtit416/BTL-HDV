const { handleError } = require('../middleware/errorHandler');
const { FRONTEND_RETURN_URL } = require('../config/constants');
const {
  toPositiveNumber,
  listPaymentsByUser,
  getPaymentByIdAndUser,
  getPaymentsByOrderAndUser,
  createVnpayPayment,
  createPaymentByOrderEvent,
  cancelPendingPaymentsByOrderEvent,
  retryVnpayPaymentByOrder,
  createCashPayment,
  confirmPaymentPaid,
  cancelPayment,
  processVnpayCallback,
} = require('../services/paymentService');

const formatPaymentResponse = (payment) => {
  if (!payment) return null;

  const keepFields = [
    'id',
    'order_id',
    'user_id',
    'method',
    'total_amount',
    'status',
    'transaction_id',
    'provider',
    'payment_url',
    'customer_email',
    'fail_reason',
    'paid_at',
    'created_at',
    'updated_at',
  ];

  const formatted = {};
  for (const key of keepFields) {
    const value = payment[key];
    if (value !== null && value !== undefined) {
      formatted[key] = value;
    }
  }

  return formatted;
};

const extractOrderIdFromTxnRef = (txnRef) => {
  const value = String(txnRef || '');
  const match = value.match(/^OD(\d+)-/i);
  return match ? match[1] : '';
};

const getAllPayments = async (req, res) => {
  try {
    const rows = await listPaymentsByUser(req.user.id);
    return res.json({ success: true, data: (rows || []).map(formatPaymentResponse) });
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

    return res.json({ success: true, data: formatPaymentResponse(row) });
  } catch (error) {
    return handleError(error, res);
  }
};

const getPaymentsByOrder = async (req, res) => {
  try {
    const rows = await getPaymentsByOrderAndUser(req.params.orderId, req.user.id);
    return res.json({ success: true, data: (rows || []).map(formatPaymentResponse) });
  } catch (error) {
    return handleError(error, res);
  }
};

const retryPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const { payment } = await retryVnpayPaymentByOrder({
      orderId,
      userId: req.user.id,
      description: req.body?.description,
      ipAddr: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Retry payment URL generated successfully',
      data: formatPaymentResponse(payment),
    });
  } catch (error) {
    return handleError(error, res, error.status || 500);
  }
};

const generateVnpayPayment = async (req, res) => {
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

    const { payment } = await createVnpayPayment({
      orderId: order_id,
      userId: user_id,
      amount,
      description,
      userEmail: req.user.email || null,
      ipAddr: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: formatPaymentResponse(payment),
      message: 'VNPAY payment URL generated successfully',
    });
  } catch (error) {
    return handleError(error, res, error.status || 500);
  }
};

const orderCreatedEvent = async (req, res) => {
  try {
    const { order_id, user_id, total_amount, payment_method, description, user_email } = req.body;
    const amount = toPositiveNumber(total_amount);

    if (!order_id || !user_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'order_id, user_id and valid total_amount are required',
      });
    }

    const { payment } = await createPaymentByOrderEvent({
      orderId: order_id,
      userId: user_id,
      amount,
      paymentMethod: payment_method,
      description,
      userEmail: user_email || null,
      ipAddr: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: formatPaymentResponse(payment),
      message: 'Payment created from ORDER_CREATED event',
    });
  } catch (error) {
    return handleError(error, res, error.status || 500);
  }
};

const orderCancelledEvent = async (req, res) => {
  try {
    const orderId = Number(req.body?.order_id);
    const reason = req.body?.reason;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid order_id is required',
      });
    }

    const result = await cancelPendingPaymentsByOrderEvent({ orderId, reason });
    return res.status(200).json({
      success: true,
      message: 'Payments cancelled from ORDER_CANCELLED event',
      data: result,
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
      data: formatPaymentResponse(payment),
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

    return res.json({
      success: true,
      data: formatPaymentResponse(updated),
      message: 'Payment confirmed successfully',
    });
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

    return res.json({
      success: true,
      data: formatPaymentResponse(updated),
      message: 'Payment cancelled successfully',
    });
  } catch (error) {
    return handleError(error, res);
  }
};

const vnpayReturn = async (req, res) => {
  try {
    const result = await processVnpayCallback({
      query: req.query,
      providerEventId: req.query.vnp_TransactionNo || req.query.vnp_TxnRef || null,
    });

    const status = result?.payment?.status || 'UNKNOWN';
    const orderId = String(result?.payment?.order_id || extractOrderIdFromTxnRef(req.query?.vnp_TxnRef));
    const redirectUrl = `${FRONTEND_RETURN_URL}?payment_status=${encodeURIComponent(status)}&order_id=${encodeURIComponent(orderId || '')}`;

    if (result.ignored) {
      return res.redirect(302, redirectUrl);
    }

    return res.redirect(302, redirectUrl);
  } catch (error) {
    console.error('[VNPAY RETURN] Failed:', {
      message: error.message,
      status: error.status || 500,
      txnRef: req.query?.vnp_TxnRef,
      responseCode: req.query?.vnp_ResponseCode,
      transactionStatus: req.query?.vnp_TransactionStatus,
    });
    const orderId = extractOrderIdFromTxnRef(req.query?.vnp_TxnRef);
    const failedRedirectUrl = `${FRONTEND_RETURN_URL}?payment_status=FAILED&order_id=${encodeURIComponent(orderId || '')}&error=${encodeURIComponent(error.message || 'Payment failed')}`;
    return res.redirect(302, failedRedirectUrl);
  }
};

const vnpayIpn = async (req, res) => {
  try {
    const eventId = req.query.vnp_TransactionNo || req.query.vnp_TxnRef || null;
    await processVnpayCallback({
      query: req.query,
      providerEventId: eventId,
    });

    return res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('[VNPAY IPN] Failed:', {
      message: error.message,
      status: error.status || 500,
      txnRef: req.query?.vnp_TxnRef,
      responseCode: req.query?.vnp_ResponseCode,
      transactionStatus: req.query?.vnp_TransactionStatus,
    });
    return res.status(error.status || 500).json({
      RspCode: '99',
      Message: error.message || 'Unknown error',
    });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  getPaymentsByOrder,
  retryPaymentByOrder,
  generateVnpayPayment,
  orderCreatedEvent,
  orderCancelledEvent,
  createCash,
  confirmPayment,
  cancelPaymentById,
  vnpayReturn,
  vnpayIpn,
};
