const axios = require('axios');
const crypto = require('crypto');
const qs = require('qs');
const pool = require('../db');
const {
  VNPAY_PAYMENT_URL,
  VNPAY_RETURN_URL,
  VNPAY_TMN_CODE,
  VNPAY_HASH_SECRET,
  VNPAY_VERSION,
  VNPAY_COMMAND,
  VNPAY_CURR_CODE,
  VNPAY_LOCALE,
  VNPAY_ORDER_TYPE,
  VNPAY_IP_ADDR_FALLBACK,
  INTERNAL_EVENT_SECRET,
  ORDER_SERVICE_URL,
  ORDER_INTERNAL_SECRET,
  NOTIFICATION_SERVICE_URL,
} = require('../config/constants');

const toPositiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const toPositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const formatDateYmdHis = (date) => {
  const d = date || new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
};

const sortObject = (obj) => {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
    });
  return sorted;
};

const buildSignData = (params) => {
  const sorted = sortObject(params);
  return qs.stringify(sorted, { encode: false });
};

const signVnpayParams = (params) => {
  if (!VNPAY_HASH_SECRET) {
    return '';
  }

  const signData = buildSignData(params);
  return crypto.createHmac('sha512', VNPAY_HASH_SECRET).update(signData, 'utf8').digest('hex');
};

const createVnpayUrl = ({ txnRef, amount, orderInfo, ipAddr }) => {
  if (!VNPAY_TMN_CODE || !VNPAY_HASH_SECRET) {
    const err = new Error('Missing VNPAY_TMN_CODE or VNPAY_HASH_SECRET');
    err.status = 500;
    throw err;
  }

  const baseParams = {
    vnp_Version: VNPAY_VERSION,
    vnp_Command: VNPAY_COMMAND,
    vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Locale: VNPAY_LOCALE,
    vnp_CurrCode: VNPAY_CURR_CODE,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: VNPAY_ORDER_TYPE,
    vnp_Amount: Math.round(amount * 100),
    vnp_ReturnUrl: VNPAY_RETURN_URL,
    vnp_IpAddr: ipAddr || VNPAY_IP_ADDR_FALLBACK,
    vnp_CreateDate: formatDateYmdHis(new Date()),
  };

  const secureHash = signVnpayParams(baseParams);
  const query = buildSignData(baseParams);

  return `${VNPAY_PAYMENT_URL}?${query}&vnp_SecureHash=${secureHash}`;
};

const normalizeIp = (ipAddr) => {
  if (!ipAddr) return VNPAY_IP_ADDR_FALLBACK;
  if (ipAddr.startsWith('::ffff:')) {
    return ipAddr.replace('::ffff:', '');
  }
  if (ipAddr === '::1') {
    return '127.0.0.1';
  }
  return ipAddr;
};

const verifyVnpaySignature = (queryParams) => {
  if (!VNPAY_HASH_SECRET) {
    const err = new Error('Missing VNPAY_HASH_SECRET');
    err.status = 500;
    throw err;
  }

  const payload = { ...queryParams };
  const receivedHash = payload.vnp_SecureHash;
  delete payload.vnp_SecureHash;
  delete payload.vnp_SecureHashType;

  const expectedHash = signVnpayParams(payload);
  const normalizedReceived = String(receivedHash || '').trim().toLowerCase();
  const normalizedExpected = String(expectedHash || '').trim().toLowerCase();
  const left = Buffer.from(normalizedReceived, 'utf8');
  const right = Buffer.from(normalizedExpected, 'utf8');

  if (left.length === 0 || left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    console.error('[VNPAY] Signature mismatch', {
      txnRef: payload.vnp_TxnRef,
      responseCode: payload.vnp_ResponseCode,
      receivedLength: normalizedReceived.length,
      expectedLength: normalizedExpected.length,
      receivedPreview: normalizedReceived.slice(0, 12),
      expectedPreview: normalizedExpected.slice(0, 12),
    });
    const err = new Error('Invalid VNPAY signature');
    err.status = 401;
    throw err;
  }
};

const updateOrderStatus = async ({ orderId, status }) => {
  await axios.patch(
    `${ORDER_SERVICE_URL}/internal/orders/${orderId}/payment-status`,
    { status },
    {
      timeout: 10000,
      headers: {
        'x-internal-secret': ORDER_INTERNAL_SECRET,
      },
    }
  );
};

const emitPaymentSuccessEvent = async ({ payment, transactionId }) => {
  await axios.post(
    `${NOTIFICATION_SERVICE_URL}/api/events/payment-success`,
    {
      user_id: payment.user_id,
      order_id: payment.order_id,
      payment_id: payment.id,
      amount: payment.total_amount,
      transaction_id: transactionId || payment.transaction_id || null,
      customer_email: payment.customer_email || null,
    },
    {
      timeout: 10000,
      headers: {
        'x-internal-secret': INTERNAL_EVENT_SECRET,
      },
    }
  );
};

const ensurePaymentSchema = async () => {
  const ddlStatements = [
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(50)',
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'VNPAY'",
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2)',
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING'",
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255)',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_url TEXT',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255)',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS fail_reason TEXT',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  ];

  for (const sql of ddlStatements) {
    await pool.query(sql);
  }

  await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
      provider_event_id VARCHAR(255) UNIQUE NOT NULL,
      provider VARCHAR(50) NOT NULL,
      payload JSONB,
      signature TEXT,
      status VARCHAR(50) DEFAULT 'RECEIVED',
      processed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const listPaymentsByUser = async (userId) => {
  const result = await pool.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [userId]);
  return result.rows;
};

const getPaymentByIdAndUser = async (id, userId) => {
  const result = await pool.query('SELECT * FROM payments WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rows[0] || null;
};

const getPaymentsByOrderAndUser = async (orderId, userId) => {
  const result = await pool.query('SELECT * FROM payments WHERE order_id = $1 AND user_id = $2 ORDER BY created_at DESC', [orderId, userId]);
  return result.rows;
};

const createVnpayPayment = async ({ orderId, userId, amount, description, userEmail, ipAddr }) => {
  const txnRef = `OD${orderId}-${Date.now()}`;
  const orderInfo = description || `Thanh toan don hang #${orderId}`;
  const paymentUrl = createVnpayUrl({
    txnRef,
    amount,
    orderInfo,
    ipAddr: normalizeIp(ipAddr),
  });

  const result = await pool.query(
    `INSERT INTO payments (
      order_id, user_id, method, provider, total_amount, status, transaction_id,
      payment_url, customer_email, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, NOW(), NOW()
    ) RETURNING *`,
    [orderId, userId, 'QR', 'VNPAY', amount, 'PENDING', txnRef, paymentUrl, userEmail || null]
  );

  return {
    payment: result.rows[0],
    payment_url: paymentUrl,
  };
};

const createCashPayment = async ({ orderId, userId, amount, description, userEmail }) => {
  const result = await pool.query(
    `INSERT INTO payments (
      order_id, user_id, method, provider, total_amount, status, transaction_id,
      payment_url, customer_email, fail_reason, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, NOW(), NOW()
    ) RETURNING *`,
    [
      orderId,
      userId,
      'CASH',
      'OFFLINE',
      amount,
      'PENDING_CASH',
      null,
      null,
      userEmail || null,
      description || 'Thanh toan tien mat khi nhan hang',
    ]
  );

  return result.rows[0];
};

const createPaymentByOrderEvent = async ({ orderId, userId, amount, paymentMethod, description, userEmail, ipAddr }) => {
  const method = String(paymentMethod || 'QR').trim().toUpperCase();
  if (method === 'CASH') {
    const payment = await createCashPayment({ orderId, userId, amount, description, userEmail });
    return { payment, payment_url: null };
  }

  const vnpay = await createVnpayPayment({ orderId, userId, amount, description, userEmail, ipAddr });
  return { payment: vnpay.payment, payment_url: vnpay.payment_url };
};

const retryVnpayPaymentByOrder = async ({ orderId, userId, description, ipAddr }) => {
  const parsedOrderId = toPositiveInt(orderId);
  const parsedUserId = toPositiveInt(userId);

  if (!parsedOrderId || !parsedUserId) {
    const err = new Error('Valid orderId and userId are required');
    err.status = 400;
    throw err;
  }

  const paid = await pool.query(
    `SELECT id
     FROM payments
     WHERE order_id = $1 AND user_id = $2 AND status = 'PAID'
     LIMIT 1`,
    [parsedOrderId, parsedUserId]
  );

  if (paid.rows.length > 0) {
    const err = new Error('Order already paid');
    err.status = 409;
    throw err;
  }

  const latest = await pool.query(
    `SELECT *
     FROM payments
     WHERE order_id = $1 AND user_id = $2
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [parsedOrderId, parsedUserId]
  );

  if (latest.rows.length === 0) {
    const err = new Error('No payment found for this order');
    err.status = 404;
    throw err;
  }

  const lastPayment = latest.rows[0];
  if (String(lastPayment.method || '').toUpperCase() === 'CASH') {
    const err = new Error('Order uses CASH payment; retry VNPay is not applicable');
    err.status = 409;
    throw err;
  }

  const amount = toPositiveNumber(lastPayment.total_amount);
  if (!amount) {
    const err = new Error('Cannot retry payment because amount is invalid');
    err.status = 400;
    throw err;
  }

  await pool.query(
    `UPDATE payments
     SET status = $1,
         fail_reason = COALESCE(fail_reason, 'Replaced by retry'),
         updated_at = NOW()
     WHERE order_id = $2 AND user_id = $3 AND method = 'QR' AND status IN ('PENDING', 'FAILED')`,
    ['RETRY_REPLACED', parsedOrderId, parsedUserId]
  );

  return createVnpayPayment({
    orderId: parsedOrderId,
    userId: parsedUserId,
    amount,
    description: description || `Thanh toan lai don hang #${parsedOrderId}`,
    userEmail: lastPayment.customer_email || null,
    ipAddr,
  });
};

const markPaymentPaidById = async ({ paymentId, transactionId }) => {
  const found = await pool.query('SELECT * FROM payments WHERE id = $1 LIMIT 1', [paymentId]);
  if (found.rows.length === 0) {
    return null;
  }

  const current = found.rows[0];
  const alreadyPaid = String(current.status || '').toUpperCase() === 'PAID';

  const updated = await pool.query(
    `UPDATE payments
     SET status = $1,
         transaction_id = COALESCE($2, transaction_id),
         paid_at = NOW(),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    ['PAID', transactionId || null, paymentId]
  );

  const payment = updated.rows[0];

  if (!alreadyPaid) {
    try {
      await updateOrderStatus({ orderId: payment.order_id, status: 'PAID' });
    } catch (error) {
      console.error('Update order status failed:', error.message);
    }

    try {
      await emitPaymentSuccessEvent({ payment, transactionId: payment.transaction_id });
    } catch (error) {
      console.error('Emit PAYMENT_SUCCESS failed:', error.message);
    }
  }

  return payment;
};

const confirmPaymentPaid = async ({ paymentId, userId, transactionId }) => {
  const found = await pool.query('SELECT * FROM payments WHERE id = $1 AND user_id = $2 LIMIT 1', [paymentId, userId]);
  if (found.rows.length === 0) {
    return null;
  }

  return markPaymentPaidById({
    paymentId,
    transactionId: transactionId || found.rows[0].transaction_id || null,
  });
};

const cancelPayment = async ({ paymentId, userId, reason }) => {
  const result = await pool.query(
    `UPDATE payments
     SET status = $1,
         fail_reason = $2,
         updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    ['CANCELLED', reason || 'Cancelled by user', paymentId, userId]
  );

  return result.rows[0] || null;
};

const processVnpayCallback = async ({ query, providerEventId }) => {
  verifyVnpaySignature(query);

  const txnRef = query.vnp_TxnRef;
  const responseCode = query.vnp_ResponseCode;
  const transactionStatus = query.vnp_TransactionStatus;
  const gatewayTxnNo = query.vnp_TransactionNo || null;

  if (!txnRef) {
    const err = new Error('Missing vnp_TxnRef');
    err.status = 400;
    throw err;
  }

  const paymentResult = await pool.query('SELECT * FROM payments WHERE transaction_id = $1 LIMIT 1', [txnRef]);
  if (paymentResult.rows.length === 0) {
    const err = new Error('Payment not found for VNPAY callback');
    err.status = 404;
    throw err;
  }

  const payment = paymentResult.rows[0];

  if (providerEventId) {
    const existed = await pool.query(
      'SELECT id FROM payment_webhook_events WHERE provider_event_id = $1 LIMIT 1',
      [providerEventId]
    );

    if (existed.rows.length > 0) {
      return { duplicate: true, payment };
    }
  }

  const isSuccess = String(responseCode) === '00' && String(transactionStatus || '00') === '00';

  if (!isSuccess) {
    await pool.query(
      `UPDATE payments
       SET status = $1,
           fail_reason = $2,
           updated_at = NOW()
       WHERE id = $3`,
      ['FAILED', `VNPAY response ${responseCode || 'N/A'}`, payment.id]
    );

    if (providerEventId) {
      await pool.query(
        `INSERT INTO payment_webhook_events (
          payment_id, provider_event_id, provider, payload, signature, status, processed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [payment.id, providerEventId, 'VNPAY', JSON.stringify(query), null, 'FAILED']
      );
    }

    return {
      payment: {
        ...payment,
        status: 'FAILED',
      },
    };
  }

  const updated = await markPaymentPaidById({
    paymentId: payment.id,
    transactionId: gatewayTxnNo || txnRef,
  });

  if (providerEventId) {
    await pool.query(
      `INSERT INTO payment_webhook_events (
        payment_id, provider_event_id, provider, payload, signature, status, processed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [updated.id, providerEventId, 'VNPAY', JSON.stringify(query), null, 'PROCESSED']
    );
  }

  return { payment: updated };
};

module.exports = {
  toPositiveNumber,
  toPositiveInt,
  ensurePaymentSchema,
  listPaymentsByUser,
  getPaymentByIdAndUser,
  getPaymentsByOrderAndUser,
  createVnpayPayment,
  createCashPayment,
  createPaymentByOrderEvent,
  retryVnpayPaymentByOrder,
  confirmPaymentPaid,
  cancelPayment,
  processVnpayCallback,
};
