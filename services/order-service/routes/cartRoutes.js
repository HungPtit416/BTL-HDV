const express = require('express');
const {
  getCartByUser,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');

const router = express.Router();

router.get('/cart/:userId', getCartByUser);
router.post('/cart/items', addCartItem);
router.patch('/cart/items/:itemId', updateCartItem);
router.delete('/cart/items/:itemId', removeCartItem);
router.delete('/cart/:userId/clear', clearCart);

module.exports = router;
