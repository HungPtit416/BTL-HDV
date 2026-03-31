const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Error logging helper (Giữ lại để dùng nội bộ trong controller)
const handleError = (error, res, statusCode = 500) => {
    console.error('Error:', {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
    });

    const errorMessage = error.code === 'ENOTFOUND' || error.message.includes('EAI_AGAIN')
        ? 'Database connection error. Please try again.'
        : error.message;

    res.status(statusCode).json({
        success: false,
        error: errorMessage
    });
};

// Hàm tiện ích tạo Token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role || 'user'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

// --- EXPORTS ---

// Get all users
exports.getUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email FROM users LIMIT 10');
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        handleError(error, res);
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT id, name, email, phone FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        handleError(error, res);
    }
};

// Register User
exports.registerUser = async (req, res) => {
    const client = await pool.connect(); // Dùng transaction để đảm bảo insert role thành công
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin bắt buộc' });
        }

        await client.query('BEGIN');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userResult = await client.query(
            'INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
            [name, email, hashedPassword, phone]
        );
        const newUser = userResult.rows[0];

        const roleResult = await client.query("SELECT id FROM roles WHERE name = 'user'");
        if (roleResult.rows.length > 0) {
            await client.query(
                'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
                [newUser.id, roleResult.rows[0].id]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            data: { user: newUser, token: generateToken({ ...newUser, role: 'user' }) },
            message: 'Đăng ký thành công'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') return res.status(400).json({ success: false, error: 'Email đã tồn tại' });
        handleError(error, res);
    } finally {
        client.release();
    }
};

// Login User
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userQuery = `
            SELECT u.*, r.name as role_name 
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.email = $1
        `;
        const result = await pool.query(userQuery, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Email không tồn tại hoặc tài khoản bị khóa' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, error: 'Mật khẩu không đúng' });

        res.json({
            success: true,
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role_name || 'user', avatar: user.avatar },
                token: generateToken({ id: user.id, email: user.email, role: user.role_name })
            }
        });
    } catch (error) {
        handleError(error, res);
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Email không tồn tại' });
        }

        // Tạo Token ngẫu nhiên (Reset Token)
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Gửi Email
        const resetUrl = `http://localhost:3000/resetpassword/${resetToken}`;
        const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu thay đổi mật khẩu. Vui lòng nhấn vào link: \n\n ${resetUrl}`;

        await sendEmail({
            email: email,
            subject: 'Khôi phục mật khẩu - HDV Shop',
            message: message
        });

        res.json({ success: true, message: 'Email khôi phục đã được gửi' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Không thể gửi email' });
    }
};