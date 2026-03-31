import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '', // Thêm trường name
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("Mật khẩu nhập lại không khớp!");
            return;
        }

        try {
            const response = await axios.post('http://localhost:3001/api/users/register', {
                name: formData.name, // Gửi tên người dùng nhập vào
                email: formData.email,
                password: formData.password
            });

            if (response.data.success) {
                alert("Đăng ký thành công!");
                navigate('/login');
            }
        } catch (error) {
            console.error("Lỗi đăng ký:", error.response?.data);
            alert(error.response?.data?.error || "Đăng ký thất bại, vui lòng thử lại!");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-gray-100">
                <h2 className="text-3xl font-bold text-blue-900 mb-8 text-center">Đăng ký</h2>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    {/* Input Họ và tên - THÊM MỚI TẠI ĐÂY */}
                    <input
                        type="text"
                        name="name"
                        placeholder="Họ và tên"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-full focus:ring-2 focus:ring-orange-500 outline-none"
                        required
                    />

                    {/* Input Email */}
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-full focus:ring-2 focus:ring-orange-500 outline-none"
                        required
                    />

                    {/* Input Mật khẩu */}
                    <input
                        type="password"
                        name="password"
                        placeholder="Mật khẩu"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-full focus:ring-2 focus:ring-orange-500 outline-none"
                        required
                    />

                    {/* Input Nhập lại mật khẩu */}
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Nhập lại mật khẩu"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-full focus:ring-2 focus:ring-orange-500 outline-none"
                        required
                    />

                    <div className="flex items-center space-x-2 px-2">
                        <input type="checkbox" id="terms" className="accent-orange-600" required />
                        <label htmlFor="terms" className="text-xs">
                            Tôi đồng ý với <span className="text-orange-600 underline cursor-pointer">Điều khoản sử dụng dịch vụ</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-full mt-4 transition duration-300 shadow-md"
                    >
                        Đăng ký
                    </button>
                </form>

                <p className="text-center mt-6 text-sm">
                    Bạn đã có tài khoản? <Link to="/login" className="text-orange-600 font-bold hover:underline">Đăng nhập</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;