const pool = require('../db');
const { handleError } = require('../middleware/errorHandler');
const { toPositiveInt } = require('../services/orderService');
const { restoreOrderItemsToCart, restoreProductInventoryByOrder } = require('../services/orderService');

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

    const found = await pool.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
    if (found.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const current = String(found.rows[0].status || '').toUpperCase();
    if (current === status) {
      return res.json({
        success: true,
        message: 'Order payment status unchanged',
        data: found.rows[0],
      });
    }

    if ((current === 'CANCELLED' && status === 'PAID') || (current === 'PAID' && status !== 'PAID')) {
      return res.status(409).json({
        success: false,
        error: `Cannot change order status from ${current} to ${status}`,
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

    if (status === 'CANCELLED') {
      try {
        await restoreOrderItemsToCart({
          orderId,
          userId: updated.rows[0].user_id,
        });
      } catch (restoreError) {
        console.error('Restore cart items failed after internal cancel:', restoreError.message);
      }

      try {
        await restoreProductInventoryByOrder({ orderId });
      } catch (restoreError) {
        console.error('Restore product inventory failed after internal cancel:', restoreError.message);
      }
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

const getOrderInternal = async (req, res) => {
  try {
    const orderId = toPositiveInt(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Valid order id is required',
      });
    }

    const found = await pool.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
    if (found.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    return res.json({
      success: true,
      data: found.rows[0],
    });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  updateOrderPaymentStatus,
  getOrderInternal,
};
