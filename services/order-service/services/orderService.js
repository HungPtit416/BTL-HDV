const axios = require('axios');
const pool = require('../db');
const { PRODUCT_SERVICE_URL } = require('../config/constants');

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
};
