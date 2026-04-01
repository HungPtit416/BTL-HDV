const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const pool = require('../db');
const {
  VIETQR_API_URL,
  VIETQR_CLIENT_ID,
  VIETQR_API_KEY,
  VIETQR_BANK_BIN,
  VIETQR_BANK_ACCOUNT,
  VIETQR_ACCOUNT_NAME,
  QR_EXPIRE_MINUTES,
  PAYMENT_WEBHOOK_SECRET,
  PAYMENT_WEBHOOK_SIGNING_SECRET,
  PAYMENT_WEBHOOK_TOLERANCE_SECONDS,
  ORDER_SERVICE_URL,
  ORDER_INTERNAL_SECRET,
  EMAIL_USER,
  EMAIL_PASSWORD,
} = require('../config/constants');

const toPositiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const buildVietQrPayload = ({ amount, description }) => ({
  accountNo: VIETQR_BANK_ACCOUNT,
  accountName: VIETQR_ACCOUNT_NAME,
  acqId: VIETQR_BANK_BIN,
  amount: Math.round(amount),
  addInfo: description,
  format: 'text',
  template: 'compact2',
});

const buildVietQrImageUrl = ({ amount, description }) => {
  const base = `https://img.vietqr.io/image/${VIETQR_BANK_BIN}-${VIETQR_BANK_ACCOUNT}-compact2.png`;
  const params = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: description,
    accountName: VIETQR_ACCOUNT_NAME,
  });
  return `${base}?${params.toString()}`;
};

const generateVietQr = async ({ amount, description }) => {
  if (!VIETQR_BANK_BIN || !VIETQR_BANK_ACCOUNT) {
    const err = new Error('Missing VietQR bank config (VIETQR_BANK_BIN, VIETQR_BANK_ACCOUNT)');
    err.status = 500;
    throw err;
  }

  const payload = buildVietQrPayload({ amount, description });

  if (VIETQR_CLIENT_ID && VIETQR_API_KEY) {
    try {
      const response = await axios.post(VIETQR_API_URL, payload, {
        timeout: 15000,
        headers: {
          'x-client-id': VIETQR_CLIENT_ID,
          'x-api-key': VIETQR_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data?.data || {};
      const qrImageUrl = data.qrDataURL || data.qrCodeURL || data.qrCode || null;
      const qrContent = data.qrData || data.qrContent || payload.addInfo;

      if (qrImageUrl) {
        return { qrImageUrl, qrContent };
      }
    } catch (error) {
      console.warn('VietQR API generate failed, fallback to static VietQR image URL:', error.message);
    }
  }

  return {
    qrImageUrl: buildVietQrImageUrl({ amount, description }),
    qrContent: description,
  };
};

const isPaymentSuccessfulStatus = (value) => {
  if (!value) return false;
  const normalized = String(value).trim().toUpperCase();
  return ['PAID', 'SUCCESS', 'COMPLETED', '00'].includes(normalized);
};

const safeCompare = (a, b) => {
  const left = Buffer.from(String(a), 'utf8');
  const right = Buffer.from(String(b), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const verifyWebhookSignature = ({ signature, timestamp, rawBody }) => {
  if (!signature || !timestamp || !rawBody) {
    return { valid: false, reason: 'Missing signature headers or raw body' };
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowInSeconds - timestamp) > PAYMENT_WEBHOOK_TOLERANCE_SECONDS) {
    return { valid: false, reason: 'Webhook timestamp is outside tolerance window' };
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', PAYMENT_WEBHOOK_SIGNING_SECRET)
    .update(signedPayload)
    .digest('hex');

  const normalized = String(signature).replace(/^sha256=/i, '').trim();
  if (!safeCompare(normalized, expected)) {
    return { valid: false, reason: 'Invalid webhook signature' };
  }

  return { valid: true };
};

const sendPaymentSuccessEmail = async ({ toEmail, orderId, paymentId, amount, transactionId }) => {
  if (!toEmail || !EMAIL_USER || !EMAIL_PASSWORD) {
    console.warn('Skipping payment success email: missing recipient or SMTP credentials');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });

  const amountText = Number(amount || 0).toLocaleString('vi-VN');
  await transporter.sendMail({
    from: `"HDV Shop" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `Thanh toan thanh cong #${orderId}`,
    text: `Thanh toan don hang #${orderId} thanh cong.\nMa payment: ${paymentId}\nSo tien: ${amountText} VND\nMa giao dich: ${transactionId || 'N/A'}`,
  });
};

const updateOrderStatus = async ({ orderId, status }) => {
  if (!orderId || !status) return;

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

const ensurePaymentSchema = async () => {
  const ddlStatements = [
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'VIETQR'",
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS qr_content TEXT',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS qr_image_url TEXT',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_bin VARCHAR(20)',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50)',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_name VARCHAR(255)',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS fail_reason TEXT',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255)',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2)',
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(50)',
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING'",
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255)',
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
  await pool.query('CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_payment_id ON payment_webhook_events(payment_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_provider ON payment_webhook_events(provider)');
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
  const result = await pool.query(
    'SELECT * FROM payments WHERE order_id = $1 AND user_id = $2 ORDER BY created_at DESC',
    [orderId, userId]
  );
  return result.rows;
};

const createQrPayment = async ({ orderId, userId, amount, description, userEmail }) => {
  const paymentDescription = description || `Thanh toan don hang #${orderId}`;
  const expiresAt = new Date(Date.now() + QR_EXPIRE_MINUTES * 60 * 1000);

  const { qrImageUrl, qrContent } = await generateVietQr({ amount, description: paymentDescription });

  const result = await pool.query(
    `INSERT INTO payments (
      order_id, user_id, method, provider, total_amount, status, transaction_id,
      qr_content, qr_image_url, bank_bin, bank_account, account_name, customer_email, expired_at, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
    ) RETURNING *`,
    [
      orderId,
      userId,
      'VIETQR',
      'VIETQR',
      amount,
      'QR_GENERATED',
      `VIETQR-${orderId}-${Date.now()}`,
      qrContent,
      qrImageUrl,
      VIETQR_BANK_BIN,
      VIETQR_BANK_ACCOUNT,
      VIETQR_ACCOUNT_NAME,
      userEmail || null,
      expiresAt,
    ]
  );

  return {
    payment: result.rows[0],
    qr: {
      qr_image_url: qrImageUrl,
      qr_content: qrContent,
      expired_at: expiresAt,
    },
  };
};

const createCashPayment = async ({ orderId, userId, amount, description, userEmail }) => {
  const result = await pool.query(
    `INSERT INTO payments (
      order_id, user_id, method, provider, total_amount, status, transaction_id,
      qr_content, qr_image_url, bank_bin, bank_account, account_name, customer_email, expired_at, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
    ) RETURNING *`,
    [
      orderId,
      userId,
      'CASH',
      'OFFLINE',
      amount,
      'PENDING_CASH',
      null,
      description || `Thanh toan tien mat don hang #${orderId}`,
      null,
      null,
      null,
      null,
      userEmail || null,
      null,
    ]
  );

  return result.rows[0];
};

const confirmPaymentPaid = async ({ paymentId, userId, transactionId, userEmail }) => {
  const currentResult = await pool.query('SELECT * FROM payments WHERE id = $1 AND user_id = $2 LIMIT 1', [paymentId, userId]);
  if (currentResult.rows.length === 0) {
    return null;
  }

  const alreadyPaid = String(currentResult.rows[0].status || '').toUpperCase() === 'PAID';

  const result = await pool.query(
    `UPDATE payments
     SET status = $1,
         transaction_id = COALESCE($2, transaction_id),
         paid_at = NOW(),
         updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    ['PAID', transactionId || null, paymentId, userId]
  );

  const updated = result.rows[0];

  if (!alreadyPaid) {
    try {
      await updateOrderStatus({ orderId: updated.order_id, status: 'PAID' });
    } catch (orderUpdateError) {
      console.error('Update order PAID from confirm failed:', orderUpdateError.message);
    }

    try {
      await sendPaymentSuccessEmail({
        toEmail: userEmail,
        orderId: updated.order_id,
        paymentId: updated.id,
        amount: updated.total_amount,
        transactionId: updated.transaction_id,
      });
    } catch (mailError) {
      console.error('Confirm payment email send failed:', mailError.message);
    }
  }

  return updated;
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

const processWebhook = async ({ headers, body, rawBody }) => {
  const signature = headers['x-webhook-signature'] || headers['x-signature'] || null;
  const timestampRaw = headers['x-webhook-timestamp'] || headers['x-timestamp'] || null;
  const timestamp = Number(timestampRaw);
  const eventId = headers['x-webhook-id'] || body?.event_id || body?.webhook_event_id || null;

  const signatureResult = verifyWebhookSignature({
    signature,
    timestamp: Number.isFinite(timestamp) ? timestamp : null,
    rawBody,
  });

  if (!signatureResult.valid) {
    const providedSecret = headers['x-webhook-secret'] || body?.webhook_secret || null;
    if (!providedSecret || providedSecret !== PAYMENT_WEBHOOK_SECRET) {
      const err = new Error(signatureResult.reason);
      err.status = 401;
      throw err;
    }
  }

  const {
    payment_id,
    order_id,
    transaction_id,
    amount,
    status,
    bank_transaction_id,
    content,
    customer_email,
    email,
  } = body || {};

  if (eventId) {
    const existingEvent = await pool.query(
      'SELECT id, payment_id, status FROM payment_webhook_events WHERE provider_event_id = $1 LIMIT 1',
      [eventId]
    );

    if (existingEvent.rows.length > 0) {
      return {
        duplicate: true,
        data: existingEvent.rows[0],
      };
    }
  }

  if (!isPaymentSuccessfulStatus(status)) {
    return { ignored: true };
  }

  let paymentResult = null;

  if (payment_id) {
    paymentResult = await pool.query('SELECT * FROM payments WHERE id = $1 LIMIT 1', [payment_id]);
  }

  if ((!paymentResult || paymentResult.rows.length === 0) && transaction_id) {
    paymentResult = await pool.query('SELECT * FROM payments WHERE transaction_id = $1 LIMIT 1', [transaction_id]);
  }

  if ((!paymentResult || paymentResult.rows.length === 0) && order_id) {
    paymentResult = await pool.query(
      `SELECT *
       FROM payments
       WHERE order_id = $1 AND method = 'VIETQR' AND status IN ('QR_GENERATED', 'PENDING')
       ORDER BY id DESC
       LIMIT 1`,
      [order_id]
    );
  }

  if (!paymentResult || paymentResult.rows.length === 0) {
    const err = new Error('Payment not found for webhook payload');
    err.status = 404;
    throw err;
  }

  const payment = paymentResult.rows[0];
  const webhookAmount = toPositiveNumber(amount);
  if (webhookAmount && Number(payment.total_amount) !== Number(webhookAmount)) {
    const err = new Error('Amount mismatch with payment record');
    err.status = 400;
    throw err;
  }

  const finalTxnId = transaction_id || bank_transaction_id || payment.transaction_id;
  const alreadyPaid = String(payment.status || '').toUpperCase() === 'PAID';

  const updated = await pool.query(
    `UPDATE payments
     SET status = $1,
         transaction_id = $2,
         qr_content = COALESCE($3, qr_content),
         paid_at = NOW(),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    ['PAID', finalTxnId, content || null, payment.id]
  );

  if (eventId) {
    await pool.query(
      `INSERT INTO payment_webhook_events (
        payment_id, provider_event_id, provider, payload, signature, status, processed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        payment.id,
        eventId,
        'VIETQR',
        JSON.stringify(body || {}),
        signature || null,
        'PROCESSED',
      ]
    );
  }

  if (!alreadyPaid) {
    try {
      await updateOrderStatus({ orderId: updated.rows[0].order_id, status: 'PAID' });
    } catch (orderUpdateError) {
      console.error('Update order PAID from webhook failed:', orderUpdateError.message);
    }
  }

  const recipientEmail = customer_email || email || payment.customer_email || null;
  if (recipientEmail && !alreadyPaid) {
    try {
      await sendPaymentSuccessEmail({
        toEmail: recipientEmail,
        orderId: updated.rows[0].order_id,
        paymentId: updated.rows[0].id,
        amount: updated.rows[0].total_amount,
        transactionId: updated.rows[0].transaction_id,
      });
    } catch (mailError) {
      console.error('Webhook payment email send failed:', mailError.message);
    }
  }

  return { payment: updated.rows[0] };
};

module.exports = {
  toPositiveNumber,
  ensurePaymentSchema,
  listPaymentsByUser,
  getPaymentByIdAndUser,
  getPaymentsByOrderAndUser,
  createQrPayment,
  createCashPayment,
  confirmPaymentPaid,
  cancelPayment,
  processWebhook,
};
