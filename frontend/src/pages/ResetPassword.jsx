import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert("Mật khẩu nhập lại không khớp!");
            return;
        }

        setIsLoading(true);
        try {
            // Gọi API cập nhật mật khẩu mới
            const res = await axios.put(`http://localhost:3001/api/users/resetpassword/${token}`, { password });
            if (res.data.success) {
                alert('Đổi mật khẩu thành công! Hãy đăng nhập lại.');
                navigate('/login');
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Link hết hạn hoặc không hợp lệ');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
                <div className="text-5xl mb-4">🔐</div>
                <h2 className="text-2xl font-bold text-blue-900 mb-2">Đặt lại mật khẩu</h2>
                <p className="text-gray-500 mb-8 text-sm">Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</p>

                <form onSubmit={handleReset} className="space-y-5 text-left">
                    <div>
                        <label className="text-xs font-bold text-orange-600 uppercase ml-2">Mật khẩu mới</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full p-3 mt-1 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 outline-none"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-orange-600 uppercase ml-2">Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full p-3 mt-1 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 outline-none"
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-orange-600 text-white font-bold py-3 rounded-full mt-4 transition duration-300 shadow-md ${isLoading ? 'opacity-50' : 'hover:bg-orange-700'}`}
                    >
                        {isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;