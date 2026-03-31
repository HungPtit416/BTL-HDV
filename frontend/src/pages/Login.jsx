import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    // Cập nhật dữ liệu khi nhập
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Xử lý đăng nhập
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/api/users/login', formData);

            if (response.data.success) {
                // Lưu token vào localStorage để dùng cho các request sau
                localStorage.setItem('token', response.data.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.data.user));

                alert(`Chào mừng ${response.data.data.user.name} đã quay trở lại!`);
                navigate('/');// Chuyển về trang chủ
            }
        } catch (error) {
            console.error("Lỗi đăng nhập:", error.response?.data);
            alert(error.response?.data?.error || "Email hoặc mật khẩu không đúng!");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="flex w-full max-w-6xl h-[600px] shadow-2xl rounded-2xl overflow-hidden bg-white">

                {/* Bên trái: Hình ảnh (Nhớ thay link ảnh thật của Huy vào đây) */}
                <div className="hidden md:block w-1/2 bg-cover bg-center"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1626225967045-2c77c125b211?q=80&w=2070&auto=format&fit=crop')" }}>
                </div>

                {/* Bên phải: Form */}
                <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
                    <h2 className="text-3xl font-bold text-blue-900 mb-8">Đăng nhập</h2>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="example@gmail.com"
                                className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Mật khẩu</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                                <span
                                    className="absolute right-4 top-3 cursor-pointer text-gray-400 select-none"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </span>
                            </div>
                            <div className="text-right mt-2">
                                <Link to="/forgotpassword" size="sm" className="text-orange-600 text-sm font-medium hover:underline">Quên mật khẩu?</Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-full transition duration-300 shadow-lg"
                        >
                            Đăng nhập
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-600">
                        Bạn mới biết đến FBShop? <Link to="/register" className="text-orange-600 font-bold hover:underline">Đăng ký</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;