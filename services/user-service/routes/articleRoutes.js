const express = require('express');
const router = express.Router();
const { createArticle, getArticles } = require('../controllers/articleController');
const { protect } = require('../middleware/auth');

router.get('/', getArticles);
router.post('/', protect, createArticle); // Chỉ ai login mới được viết bài

module.exports = router;