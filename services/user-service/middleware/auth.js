// middleware/auth.js

// Middleware kiểm tra xem người dùng đã đăng nhập chưa (thông qua Gateway)
const protect = (req, res, next) => {
    // req.user được gán từ middleware trong server.js (lấy từ Header của Gateway)
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            error: 'Bạn không có quyền truy cập, vui lòng đăng nhập qua Gateway'
        });
    }
    next();
};

// Middleware kiểm tra quyền hạn (Admin, User...)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Quyền hạn '${req.user?.role || 'N/A'}' không thể thực hiện hành động này.`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };