const pool = require('../db');

// @desc    Tạo bài viết mới
exports.createArticle = async (req, res) => {
    try {
        const { title, content, category_id, image_url } = req.body;
        const author_id = req.user.id; // Lấy từ middleware protect

        const result = await pool.query(
            'INSERT INTO articles (title, content, author_id, category_id, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, content, author_id, category_id, image_url]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Lấy danh sách bài viết
exports.getArticles = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, u.name as author_name, c.name as category_name 
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            LEFT JOIN article_categories c ON a.category_id = c.id
            ORDER BY a.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteArticle = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM articles WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
        }

        res.json({ success: true, message: 'Xóa bài viết thành công' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Tạo danh mục bài viết mới
// @route   POST /api/articles/categories
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Tên danh mục là bắt buộc' });
        }

        const result = await pool.query(
            'INSERT INTO article_categories (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Lấy tất cả danh mục
exports.getCategories = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM article_categories ORDER BY name ASC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};