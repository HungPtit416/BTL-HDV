const axios = require('axios');
const pool = require('../db');
const { PRODUCT_SERVICE_URL, ORDER_INTERNAL_SECRET } = require('../config/constants');

const toPositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const toPositiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const normalizePaymentMethod = ({ payment_method, payment_method_id }) => {
  if (typeof payment_method === 'string') {
    const method = payment_method.trim().toUpperCase();
    if (method === 'QR' || method === 'CASH') {
      return method;
    }
  }

  const methodId = Number(payment_method_id);
  if (methodId === 2) {
    return 'CASH';
  }
  if (methodId === 1) {
    return 'QR';
  }

  return 'QR';
};

const paymentMethodToId = (method) => (method === 'CASH' ? 2 : 1);

const canAccessUser = (reqUserId, targetUserId) => Number(reqUserId) === Number(targetUserId);

const getProductById = async (productId) => {
  const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/products/${productId}`, {
    timeout: 10000,
  });

  if (!response.data?.success || !response.data?.data) {
    throw new Error(`Product ${productId} not found`);
  }

  return response.data.data;
};

const getProductUnitPrice = (product) => {
  const price = product.selling_price ?? product.export_price ?? product.price;
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Product ${product.id} has invalid selling price`);
  }
  return n;
};

const getOrCreateCart = async (userId) => {
  const existing = await pool.query('SELECT * FROM carts WHERE user_id = $1 LIMIT 1', [userId]);
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const created = await pool.query(
    'INSERT INTO carts (user_id, created_at) VALUES ($1, NOW()) RETURNING *',
    [userId]
  );

  return created.rows[0];
};

const getCartItems = async (cartId) => {
  const result = await pool.query(
    'SELECT * FROM cart_items WHERE cart_id = $1 ORDER BY id ASC',
    [cartId]
  );
  return result.rows;
};

const removeOrderItemsFromCartAfterPaid = async ({ orderId }) => {
  const parsedOrderId = toPositiveInt(orderId);
  if (!parsedOrderId) {
    return { removed_count: 0 };
  }

  const orderResult = await pool.query('SELECT user_id FROM orders WHERE id = $1 LIMIT 1', [parsedOrderId]);
  if (orderResult.rowCount === 0) {
    return { removed_count: 0 };
  }

  const userId = orderResult.rows[0].user_id;
  const cartResult = await pool.query('SELECT id FROM carts WHERE user_id = $1 LIMIT 1', [userId]);
  if (cartResult.rowCount === 0) {
    return { removed_count: 0 };
  }

  const cartId = cartResult.rows[0].id;
  const itemsResult = await pool.query(
    `SELECT product_id, quantity
     FROM order_items
     WHERE order_id = $1
     ORDER BY id ASC`,
    [parsedOrderId]
  );

  let affected = 0;
  for (const item of itemsResult.rows) {
    const existing = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 LIMIT 1',
      [cartId, item.product_id]
    );

    if (existing.rowCount === 0) {
      continue;
    }

    const nextQty = Number(existing.rows[0].quantity) - Number(item.quantity);
    if (nextQty > 0) {
      await pool.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [nextQty, existing.rows[0].id]);
    } else {
      await pool.query('DELETE FROM cart_items WHERE id = $1', [existing.rows[0].id]);
    }
    affected += 1;
  }

  return { removed_count: affected };
};

const restoreProductInventoryByOrder = async ({ orderId }) => {
  const parsedOrderId = toPositiveInt(orderId);
  if (!parsedOrderId) {
    return { unlocked_count: 0 };
  }

  const itemsResult = await pool.query(
    `SELECT product_id, quantity
     FROM order_items
     WHERE order_id = $1
     ORDER BY id ASC`,
    [parsedOrderId]
  );

  if (itemsResult.rowCount === 0) {
    return { unlocked_count: 0 };
  }

  await axios.post(
    `${PRODUCT_SERVICE_URL}/api/products/events/order-cancelled-unlock`,
    {
      order_id: parsedOrderId,
      items: itemsResult.rows,
    },
    {
      headers: {
        'x-internal-secret': ORDER_INTERNAL_SECRET,
      },
      timeout: 10000,
    }
  );

  return { unlocked_count: itemsResult.rowCount };
};

module.exports = {
  toPositiveInt,
  toPositiveNumber,
  normalizePaymentMethod,
  paymentMethodToId,
  canAccessUser,
  getProductById,
  getProductUnitPrice,
  getOrCreateCart,
  getCartItems,
  removeOrderItemsFromCartAfterPaid,
  restoreProductInventoryByOrder,
};
