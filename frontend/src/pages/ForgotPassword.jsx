import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            // Gọi API forgotPassword (Cổng 3001)
            const response = await axios.post('http://localhost:3001/api/users/forgotpassword', { email });

            if (response.data.success) {
                setMessage("Link khôi phục đã được gửi vào email của bạn!");
            }
        } catch (error) {
            console.error("Lỗi gửi email:", error.response?.data);
            setMessage(error.response?.data?.error || "Không thể gửi email, vui lòng thử lại!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
            <div className="w-full max-w-md text-center">
                <div className="text-6xl text-orange-500 mb-4 flex justify-center animate-bounce">🔓</div>
                <h2 className="text-2xl font-bold text-orange-600 mb-2 uppercase tracking-wide">Quên mật khẩu?</h2>
                <p className="text-gray-500 mb-8 px-4">Đừng lo lắng, chúng tôi sẽ hướng dẫn bạn đặt lại mật khẩu mới qua email.</p>

                {/* Thông báo kết quả */}
                {message && (
                    <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${message.includes('thành công') || message.includes('đã được gửi')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                        {message}
                    </div>
                )}

                <form className="text-left" onSubmit={handleSubmit}>
                    <div className="mb-8">
                        <label className="text-orange-600 font-bold text-xs uppercase block mb-1">Địa chỉ Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="username@gmail.com"
                            className="w-full border-b-2 border-orange-500 py-2 focus:outline-none focus:border-orange-700 transition-colors bg-transparent"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-orange-600 text-white py-3 rounded-full flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition duration-300 shadow-md ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-700'
                            }`}
                    >
                        <span>{isLoading ? '⏳' : '✈️'}</span>
                        {isLoading ? 'Đang gửi...' : 'Gửi Email'}
                    </button>
                </form>

                <div className="mt-8">
                    <Link to="/login" className="text-sm text-gray-500 hover:text-orange-600 transition-colors font-medium">
                        ← Quay lại trang Đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;