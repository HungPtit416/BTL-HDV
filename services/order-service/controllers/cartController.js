const pool = require('../db');
const { handleError } = require('../middleware/errorHandler');
const {
  toPositiveInt,
  canAccessUser,
  getOrCreateCart,
  getCartItems,
  getProductById,
  getProductUnitPrice,
} = require('../services/orderService');

const getCartByUser = async (req, res) => {
  try {
    const userId = toPositiveInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Valid userId is required' });
    }

    if (!canAccessUser(req.user.id, userId)) {
      return res.status(403).json({ success: false, error: 'You are not allowed to access this cart' });
    }

    const cart = await getOrCreateCart(userId);
    const items = await getCartItems(cart.id);
    const subtotal = items.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);

    return res.json({
      success: true,
      data: { id: cart.id, user_id: cart.user_id, created_at: cart.created_at, items, subtotal },
    });
  } catch (error) {
    return handleError(error, res);
  }
};

const addCartItem = async (req, res) => {
  try {
    const parsedUserId = toPositiveInt(req.body.user_id);
    const parsedProductId = toPositiveInt(req.body.product_id);
    const parsedQuantity = toPositiveInt(req.body.quantity);

    if (!parsedUserId || !parsedProductId || !parsedQuantity) {
      return res.status(400).json({
        success: false,
        error: 'user_id, product_id and quantity must be positive integers',
      });
    }

    if (!canAccessUser(req.user.id, parsedUserId)) {
      return res.status(403).json({ success: false, error: 'You are not allowed to modify this cart' });
    }

    const product = await getProductById(parsedProductId);
    const unitPrice = getProductUnitPrice(product);
    const cart = await getOrCreateCart(parsedUserId);

    const existing = await pool.query(
      'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2 LIMIT 1',
      [cart.id, parsedProductId]
    );

    let item;
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE cart_items
         SET quantity = quantity + $1,
             unit_price = $2
         WHERE id = $3
         RETURNING *`,
        [parsedQuantity, unitPrice, existing.rows[0].id]
      );
      item = updated.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity, unit_price, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [cart.id, parsedProductId, parsedQuantity, unitPrice]
      );
      item = inserted.rows[0];
    }

    return res.status(201).json({ success: true, message: 'Item added to cart', data: item });
  } catch (error) {
    return handleError(error, res);
  }
};

const updateCartItem = async (req, res) => {
  try {
    const itemId = toPositiveInt(req.params.itemId);
    const quantity = toPositiveInt(req.body.quantity);

    if (!itemId || !quantity) {
      return res.status(400).json({ success: false, error: 'itemId and quantity must be positive integers' });
    }

    const itemOwner = await pool.query(
      `SELECT c.user_id
       FROM cart_items ci
       INNER JOIN carts c ON c.id = ci.cart_id
       WHERE ci.id = $1`,
      [itemId]
    );

    if (itemOwner.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    if (!canAccessUser(req.user.id, itemOwner.rows[0].user_id)) {
      return res.status(403).json({ success: false, error: 'You are not allowed to modify this cart item' });
    }

    const updated = await pool.query('UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *', [quantity, itemId]);

    if (updated.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    return res.json({ success: true, message: 'Cart item updated', data: updated.rows[0] });
  } catch (error) {
    return handleError(error, res);
  }
};

const removeCartItem = async (req, res) => {
  try {
    const itemId = toPositiveInt(req.params.itemId);
    if (!itemId) {
      return res.status(400).json({ success: false, error: 'Valid itemId is required' });
    }

    const itemOwner = await pool.query(
      `SELECT c.user_id
       FROM cart_items ci
       INNER JOIN carts c ON c.id = ci.cart_id
       WHERE ci.id = $1`,
      [itemId]
    );

    if (itemOwner.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    if (!canAccessUser(req.user.id, itemOwner.rows[0].user_id)) {
      return res.status(403).json({ success: false, error: 'You are not allowed to remove this cart item' });
    }

    const deleted = await pool.query('DELETE FROM cart_items WHERE id = $1 RETURNING id', [itemId]);
    if (deleted.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    return res.json({ success: true, message: 'Cart item removed' });
  } catch (error) {
    return handleError(error, res);
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = toPositiveInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Valid userId is required' });
    }

    if (!canAccessUser(req.user.id, userId)) {
      return res.status(403).json({ success: false, error: 'You are not allowed to clear this cart' });
    }

    const cart = await getOrCreateCart(userId);
    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);

    return res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  getCartByUser,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
