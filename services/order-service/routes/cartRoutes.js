const express = require('express');
const {
  getCartByUser,
  addCartItem,
  updateCartItem,
  increaseCartItemQuantity,
  decreaseCartItemQuantity,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');

const router = express.Router();

router.get('/cart/:userId', getCartByUser);
router.post('/cart/items', addCartItem);
router.patch('/cart/items/:itemId', updateCartItem);
router.patch('/cart/items/:itemId/increase', increaseCartItemQuantity);
router.patch('/cart/items/:itemId/decrease', decreaseCartItemQuantity);
router.delete('/cart/items/:itemId', removeCartItem);
router.delete('/cart/:userId/clear', clearCart);

module.exports = router;
