const express = require('express');
const router = express.Router();
const {
    createArticle,
    getArticles,
    deleteArticle,
    createCategory,
    getCategories
} = require('../controllers/articleController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getArticles); // Ai cũng xem được
router.post('/', protect, createArticle); // Ai đăng nhập cũng đăng bài được

// CHỈ ADMIN MỚI CÓ QUYỀN XÓA
router.delete('/:id', protect, authorize('admin'), deleteArticle);

// Routes for Categories
router.get('/categories', getCategories);
router.post('/categories', protect, authorize('admin'), createCategory); // Chỉ Admin mới được tạo danh mục

module.exports = router;