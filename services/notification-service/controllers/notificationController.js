const pool = require('../db');
const { handleError } = require('../middleware/errorHandler');
const { sendPaymentSuccessEmail } = require('../services/emailService');

const getEmailLogs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100');
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return handleError(error, res);
  }
};

const handlePaymentSuccessEvent = async (req, res) => {
  try {
    const {
      user_id,
      order_id,
      payment_id,
      amount,
      transaction_id,
      customer_email,
    } = req.body || {};

    if (!user_id || !order_id || !payment_id || !amount || !customer_email) {
      return res.status(400).json({
        success: false,
        error: 'user_id, order_id, payment_id, amount and customer_email are required',
      });
    }

    const amountText = Number(amount).toLocaleString('vi-VN');
    const title = `Thanh toan thanh cong don #${order_id}`;
    const content = `Cam on ban da thanh toan don hang #${order_id}. So tien: ${amountText} VND.`;

    try {
      await sendPaymentSuccessEmail({
        toEmail: customer_email,
        orderId: order_id,
        paymentId: payment_id,
        amount,
        transactionId: transaction_id || null,
      });

      await pool.query(
        `INSERT INTO email_logs (to_email, subject, content, status, created_at, sent_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [customer_email, title, content, 'SENT']
      );
    } catch (mailError) {
      await pool.query(
        `INSERT INTO email_logs (to_email, subject, content, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [customer_email, title, `${content}\nMail error: ${mailError.message}`, 'FAILED']
      );
      throw mailError;
    }

    return res.status(201).json({
      success: true,
      message: 'PAYMENT_SUCCESS event processed and email sent',
    });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  getEmailLogs,
  handlePaymentSuccessEvent,
};
