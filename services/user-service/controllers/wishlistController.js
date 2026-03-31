const pool = require('../db');

// @desc    Thêm sản phẩm vào danh sách yêu thích
// @route   POST /api/wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { product_id } = req.body;
        const user_id = req.user.id;
        const result = await pool.query(
            `INSERT INTO wishlist (user_id, product_id) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id, product_id) DO NOTHING 
             RETURNING *`,
            [user_id, product_id]
        );

        res.status(201).json({
            success: true,
            message: result.rowCount > 0 ? 'Đã thêm vào yêu thích' : 'Sản phẩm đã có trong danh sách'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
};

// @desc    Lấy danh sách yêu thích của người dùng đang đăng nhập
// @route   GET /api/wishlist
exports.getMyWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            'SELECT * FROM wishlist WHERE user_id = $1 ORDER BY created_at DESC',
            [user_id]
        );

        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Xóa sản phẩm khỏi danh sách yêu thích
// @route   DELETE /api/wishlist/:product_id
exports.removeFromWishlist = async (req, res) => {
    try {
        const { product_id } = req.params;
        const user_id = req.user.id;

        await pool.query(
            'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2',
            [user_id, product_id]
        );

        res.json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};