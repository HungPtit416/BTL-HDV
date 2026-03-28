const express = require('express');
const router = express.Router();
const { addToWishlist, getMyWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

// Tất cả các route wishlist đều cần đăng nhập (protect)
router.use(protect);

router.route('/')
    .get(getMyWishlist)
    .post(addToWishlist);

router.delete('/:product_id', removeFromWishlist);

module.exports = router;