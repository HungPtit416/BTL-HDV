const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// --- HELPERS ---

// Error logging helper
const handleError = (error, res, statusCode = 500) => {
    console.error('Error:', {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
    });

    const errorMessage = error.code === '23505'
        ? 'Email đã tồn tại trong hệ thống.'
        : error.message;

    res.status(statusCode).json({
        success: false,
        error: errorMessage
    });
};

// Hàm tiện ích tạo Token (Dùng chung Secret với Gateway)
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

// 1. Lấy danh sách users (Chỉ Admin)
exports.getUsers = async (req, res) => {
    try {
        // Bảo vệ thêm 1 lớp tại controller
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập danh sách này' });
        }

        const result = await pool.query('SELECT id, name, email, phone, is_active, created_at FROM users ORDER BY id DESC LIMIT 100');
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        handleError(error, res);
    }
};

// 2. Lấy thông tin user theo ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, name, email, phone, avatar, is_active, created_at FROM users WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Người dùng không tồn tại' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        handleError(error, res);
    }
};

// 3. Đăng ký người dùng mới (Dùng Transaction)
exports.registerUser = async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ name, email và password' });
        }

        await client.query('BEGIN');

        // Hash mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert User
        const userResult = await client.query(
            'INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
            [name, email, hashedPassword, phone]
        );
        const newUser = userResult.rows[0];

        // Gán Role mặc định là 'user'
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
            message: 'Đăng ký thành công',
            data: {
                user: newUser,
                token: generateToken({ ...newUser, role: 'user' })
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        handleError(error, res, 400);
    } finally {
        client.release();
    }
};

// 4. Đăng nhập
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập email và mật khẩu' });
        }

        const userQuery = `
            SELECT u.*, r.name as role_name 
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.email = $1 AND u.is_active = TRUE
        `;
        const result = await pool.query(userQuery, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Email không tồn tại hoặc tài khoản bị khóa' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Mật khẩu không chính xác' });
        }

        const userRole = user.role_name || 'user';

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: userRole,
                    avatar: user.avatar
                },
                token: generateToken({ id: user.id, email: user.email, role: userRole })
            }
        });
    } catch (error) {
        handleError(error, res);
    }
};

// 5. Quên mật khẩu (Gửi email reset)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Email không tồn tại trên hệ thống' });
        }

        // Tạo reset token nội bộ (10 phút)
        const resetToken = jwt.sign(
            { id: result.rows[0].id, type: 'reset' },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // URL này trỏ về giao diện Frontend của bạn
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/resetpassword/${resetToken}`;
        const message = `Bạn nhận được email này vì đã yêu cầu khôi phục mật khẩu.\n\nVui lòng nhấn vào link bên dưới (hết hạn sau 10 phút):\n\n${resetUrl}`;

        await sendEmail({
            email: email,
            subject: 'Khôi phục mật khẩu - HDV Shop',
            message: message
        });

        res.json({ success: true, message: 'Email khôi phục đã được gửi đi' });
    } catch (error) {
        handleError(error, res);
    }
};

// 6. Đặt lại mật khẩu mới
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        // Giải mã token reset
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, error: 'Link khôi phục đã hết hạn hoặc không hợp lệ' });
        }

        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Cập nhật Database
        const updateResult = await pool.query(
            'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
            [hashedPassword, decoded.id]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Người dùng không còn tồn tại' });
        }

        res.json({ success: true, message: 'Cập nhật mật khẩu thành công. Vui lòng đăng nhập lại.' });
    } catch (error) {
        handleError(error, res);
    }
};