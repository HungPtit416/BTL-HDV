const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Product routes
router.get('/', productController.getAllProducts);
router.post('/', productController.createProduct);
router.post('/events/order-created-lock', productController.lockInventoryByOrderEvent);
router.post('/events/order-cancelled-unlock', productController.unlockInventoryByOrderCancelledEvent);
router.get('/category/:category_id', productController.getProductsByCategory);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get('/brand/:brand_id', productController.getProductsByBrand);

module.exports = router;
