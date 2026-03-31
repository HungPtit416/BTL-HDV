// Thêm địa chỉ mới
exports.addAddress = async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;
        const user_id = req.user.id;

        const result = await pool.query(
            'INSERT INTO shipping_addresses (user_id, name, phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [user_id, name, phone, email, address]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Lấy danh sách địa chỉ của tôi
exports.getMyAddresses = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM shipping_addresses WHERE user_id = $1 ORDER BY updated_at DESC',
            [req.user.id]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};