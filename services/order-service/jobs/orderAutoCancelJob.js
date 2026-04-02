const axios = require('axios');
const pool = require('../db');
const {
  PAYMENT_SERVICE_URL,
  ORDER_INTERNAL_SECRET,
  ORDER_AUTO_CANCEL_MINUTES,
  ORDER_AUTO_CANCEL_INTERVAL_SECONDS,
} = require('../config/constants');
const { restoreProductInventoryByOrder } = require('../services/orderService');

const safePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const startOrderAutoCancelJob = () => {
  const timeoutMinutes = safePositiveInt(ORDER_AUTO_CANCEL_MINUTES, 5);
  const intervalSeconds = safePositiveInt(ORDER_AUTO_CANCEL_INTERVAL_SECONDS, 60);
  const intervalMs = intervalSeconds * 1000;

  const run = async () => {
    try {
      const result = await pool.query(
        `UPDATE orders
         SET status = 'CANCELLED',
             updated_at = NOW()
         WHERE status = 'PENDING'
           AND created_at <= NOW() - ($1::int * INTERVAL '1 minute')
         RETURNING id`,
        [timeoutMinutes]
      );

      if (result.rowCount > 0) {
        const orderIds = result.rows.map((row) => row.id);
        console.log(
          `[AUTO_CANCEL] Cancelled ${result.rowCount} pending order(s) older than ${timeoutMinutes} minute(s): ${orderIds.join(', ')}`
        );

        for (const row of result.rows) {
          const orderId = row.id;

          try {
            await restoreProductInventoryByOrder({ orderId });
          } catch (restoreError) {
            console.error(`[AUTO_CANCEL] Restore inventory failed for order ${orderId}:`, restoreError.message);
          }

          try {
            await axios.post(
              `${PAYMENT_SERVICE_URL}/api/events/order-cancelled`,
              {
                order_id: orderId,
                reason: `Auto-cancelled after ${timeoutMinutes} minutes`,
              },
              {
                headers: {
                  'x-internal-secret': ORDER_INTERNAL_SECRET,
                },
                timeout: 10000,
              }
            );
          } catch (paymentError) {
            console.error(`[AUTO_CANCEL] Notify payment service failed for order ${orderId}:`, paymentError.message);
          }
        }
      }
    } catch (error) {
      console.error('[AUTO_CANCEL] Failed to cancel expired pending orders:', error.message);
    }
  };

  console.log(
    `[AUTO_CANCEL] Job started: timeout=${timeoutMinutes} minute(s), interval=${intervalSeconds} second(s)`
  );

  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
};

module.exports = {
  startOrderAutoCancelJob,
};
