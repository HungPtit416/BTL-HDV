const pool = require('../db');
const { handleError } = require('../middleware/errorHandler');
const { toPositiveInt } = require('../services/orderService');

const updateOrderPaymentStatus = async (req, res) => {
  try {
    const orderId = toPositiveInt(req.params.id);
    const status = String(req.body?.status || '').trim().toUpperCase();

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Valid order id is required',
      });
    }

    if (!['PAID', 'FAILED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'status must be one of PAID, FAILED, CANCELLED',
      });
    }

    const updated = await pool.query(
      `UPDATE orders
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, orderId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    return res.json({
      success: true,
      message: 'Order payment status updated',
      data: updated.rows[0],
    });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  updateOrderPaymentStatus,
};
