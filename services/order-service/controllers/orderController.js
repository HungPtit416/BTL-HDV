const axios = require('axios');
const pool = require('../db');
const { PRODUCT_SERVICE_URL, PAYMENT_SERVICE_URL, ORDER_INTERNAL_SECRET } = require('../config/constants');
const { handleError } = require('../middleware/errorHandler');
const {
  toPositiveInt,
  toPositiveNumber,
  normalizePaymentMethod,
  paymentMethodToId,
  canAccessUser,
  getOrCreateCart,
  getCartItems,
  getProductById,
  getProductUnitPrice,
  restoreOrderItemsToCart,
  restoreProductInventoryByOrder,
} = require('../services/orderService');

const paymentAuthHeaders = (authorization) => ({
  Authorization: authorization,
});

const getPaymentsByOrderFromPaymentService = async ({ orderId, authorization }) => {
  const paymentResponse = await axios.get(`${PAYMENT_SERVICE_URL}/api/payments/order/${orderId}`, {
    headers: paymentAuthHeaders(authorization),
    timeout: 10000,
  });

  return paymentResponse.data?.data || [];
};

const emitOrderCancelledEvent = async ({ orderId, reason }) => {
  await axios.post(
    `${PAYMENT_SERVICE_URL}/api/events/order-cancelled`,
    {
      order_id: orderId,
      reason,
    },
    {
      headers: {
        'x-internal-secret': ORDER_INTERNAL_SECRET,
      },
      timeout: 10000,
    }
  );
};

const hidePaymentUrlForCancelledOrder = (payments, orderStatus) => {
  if (String(orderStatus || '').toUpperCase() !== 'CANCELLED') {
    return payments;
  }

  return payments.map((payment) => {
    const cloned = { ...payment };
    delete cloned.payment_url;
    return cloned;
  });
};

const checkout = async (req, res) => {
  const client = await pool.connect();

  try {
    const parsedUserId = toPositiveInt(req.body.user_id || req.user.id);
    const parsedShippingAddressId = toPositiveInt(req.body.shipping_address_id);
    const paymentMethod = normalizePaymentMethod({
      payment_method: req.body.payment_method,
      payment_method_id: req.body.payment_method_id,
    });
    const parsedPaymentMethodId = paymentMethodToId(paymentMethod);

    if (!parsedUserId || !parsedShippingAddressId) {
      return res.status(400).json({
        success: false,
        error: 'user_id and shipping_address_id must be positive integers',
      });
    }

    if (!canAccessUser(req.user.id, parsedUserId)) {
      return res.status(403).json({
        success: false,
        error: 'You are not allowed to checkout for this user',
      });
    }

    const cart = await getOrCreateCart(parsedUserId);
    const cartItems = await getCartItems(cart.id);
    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cart is empty',
      });
    }

    let finalAmount = 0;
    const itemsToInsert = [];

    for (const cartItem of cartItems) {
      const product = await getProductById(cartItem.product_id);
      const unitPrice = toPositiveNumber(cartItem.unit_price) || getProductUnitPrice(product);
      const quantity = Number(cartItem.quantity);
      const totalPrice = unitPrice * quantity;

      finalAmount += totalPrice;
      itemsToInsert.push({
        product_id: cartItem.product_id,
        quantity,
        unit_price: unitPrice,
        product_name: product.name || `Product-${cartItem.product_id}`,
        total_price: totalPrice,
      });
    }

    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, final_amount, payment_method_id, status, shipping_address_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [parsedUserId, finalAmount, parsedPaymentMethodId, 'PENDING', parsedShippingAddressId]
    );

    const order = orderResult.rows[0];

    for (const item of itemsToInsert) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, product_name, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [order.id, item.product_id, item.quantity, item.unit_price, item.product_name, item.total_price]
      );
    }

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
    await client.query('COMMIT');

    try {
      await axios.post(
        `${PRODUCT_SERVICE_URL}/api/products/events/order-created-lock`,
        {
          order_id: order.id,
          items: itemsToInsert,
        },
        {
          headers: {
            'x-internal-secret': ORDER_INTERNAL_SECRET,
          },
          timeout: 10000,
        }
      );
    } catch (inventoryError) {
      await pool.query(
        `UPDATE orders
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['FAILED', order.id]
      );

      return res.status(409).json({
        success: false,
        error: 'Inventory lock failed',
        details: inventoryError.response?.data?.error || inventoryError.message,
      });
    }

    let payment = null;
    try {
      const paymentResponse = await axios.post(
        `${PAYMENT_SERVICE_URL}/api/events/order-created`,
        {
          order_id: order.id,
          user_id: parsedUserId,
          total_amount: finalAmount,
          payment_method: paymentMethod,
          description:
            paymentMethod === 'CASH'
              ? `Thanh toan tien mat don hang #${order.id}`
              : `Thanh toan don hang #${order.id}`,
          user_email: req.user.email || null,
        },
        {
          headers: {
            'x-internal-secret': ORDER_INTERNAL_SECRET,
          },
          timeout: 15000,
        }
      );

      payment = paymentResponse.data?.data || null;
    } catch (paymentError) {
      console.error('Create payment from ORDER_CREATED failed:', paymentError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
        items: itemsToInsert,
        payment_method: paymentMethod,
        payment,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    handleError(error, res);
  } finally {
    client.release();
  }
};

const getOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, final_amount, payment_method_id, status, shipping_address_id, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    handleError(error, res);
  }
};

const getOrderById = async (req, res) => {
  try {
    const orderId = toPositiveInt(req.params.id);
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Valid order id is required',
      });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (!canAccessUser(req.user.id, orderResult.rows[0].user_id)) {
      return res.status(403).json({
        success: false,
        error: 'You are not allowed to access this order',
      });
    }

    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC', [orderId]);

    let payments = [];
    try {
      payments = await getPaymentsByOrderFromPaymentService({
        orderId,
        authorization: req.headers.authorization,
      });
      payments = hidePaymentUrlForCancelledOrder(payments, orderResult.rows[0].status);
    } catch (paymentError) {
      console.error('Fetch payment by order failed:', paymentError.message);
    }

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows,
        payments,
      },
    });
  } catch (error) {
    handleError(error, res);
  }
};

const cancelOrder = async (req, res) => {
  try {
    const orderId = toPositiveInt(req.params.id);
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Valid order id is required',
      });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const order = orderResult.rows[0];
    if (!canAccessUser(req.user.id, order.user_id)) {
      return res.status(403).json({
        success: false,
        error: 'You are not allowed to cancel this order',
      });
    }

    try {
      const payments = await getPaymentsByOrderFromPaymentService({
        orderId,
        authorization: req.headers.authorization,
      });
      const paid = payments.some((payment) => String(payment.status || '').toUpperCase() === 'PAID');
      if (paid) {
        return res.status(409).json({
          success: false,
          error: 'Order already has paid payment and cannot be cancelled',
        });
      }
    } catch (paymentError) {
      console.error('Check payment status before cancel failed:', paymentError.message);
    }

    if (String(order.status || '').toUpperCase() !== 'PENDING') {
      return res.status(409).json({
        success: false,
        error: 'Only PENDING orders can be cancelled',
      });
    }

    const updated = await pool.query(
      `UPDATE orders
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND status = $4
       RETURNING *`,
      ['CANCELLED', orderId, req.user.id, 'PENDING']
    );

    if (updated.rows.length === 0) {
      return res.status(409).json({
        success: false,
        error: 'Order status changed, cannot cancel now',
      });
    }

    try {
      await restoreOrderItemsToCart({
        orderId,
        userId: req.user.id,
      });
    } catch (restoreError) {
      console.error('Restore cart items failed after cancel:', restoreError.message);
    }

    try {
      await restoreProductInventoryByOrder({ orderId });
    } catch (restoreError) {
      console.error('Restore product inventory failed after cancel:', restoreError.message);
    }

    try {
      await emitOrderCancelledEvent({ orderId, reason: 'Order cancelled by user' });
    } catch (paymentError) {
      console.error('Cancel related payment failed:', paymentError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: updated.rows[0],
    });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  checkout,
  getOrders,
  getOrderById,
  cancelOrder,
};
