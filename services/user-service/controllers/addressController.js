const pool = require('../db');

exports.addAddress = async (req, res) => {
    try {
        const { name, phone, email, address } = req.body || {};
        const userId = Number(req.user?.id);

        if (!userId || !name || !phone || !email || !address) {
            return res.status(400).json({
                success: false,
                error: 'name, phone, email, address are required',
            });
        }

        const result = await pool.query(
            `INSERT INTO shipping_addresses (user_id, name, phone, email, address, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING *`,
            [userId, name, phone, email, address]
        );

        return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.getMyAddresses = async (req, res) => {
    try {
        const userId = Number(req.user?.id);
        const result = await pool.query(
            'SELECT * FROM shipping_addresses WHERE user_id = $1 ORDER BY updated_at DESC, id DESC',
            [userId]
        );
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.getMyAddressById = async (req, res) => {
    try {
        const userId = Number(req.user?.id);
        const addressId = Number(req.params.id);

        if (!Number.isInteger(addressId) || addressId <= 0) {
            return res.status(400).json({ success: false, error: 'Valid address id is required' });
        }

        const result = await pool.query(
            'SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2 LIMIT 1',
            [addressId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Address not found' });
        }

        return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};