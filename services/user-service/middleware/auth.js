const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    let token;

    // Kiểm tra xem token có nằm trong Header không (Dạng: Bearer <token>)
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Lấy chuỗi token từ Header
            token = req.headers.authorization.split(' ')[1];

            // Giải mã và xác thực token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Gán thông tin user đã giải mã vào đối tượng req để các route sau sử dụng
            // Ví dụ: req.user.id, req.user.email
            req.user = decoded;

            next(); // Cho phép đi tiếp vào Controller/Route chính
        } catch (error) {
            console.error('JWT Verification Error:', error.message);
            return res.status(401).json({
                success: false,
                error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Bạn không có quyền truy cập, vui lòng đăng nhập'
        });
    }
};

// Kiểm tra quyền truy cập
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Quyền hạn '${req.user.role}' không thể thực hiện hành động này.`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };