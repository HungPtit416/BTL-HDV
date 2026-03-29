import { Link } from 'react-router-dom';
const Register = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-gray-100">
                <h2 className="text-3xl font-bold text-blue-900 mb-8 text-center">Đăng ký</h2>
                <form className="space-y-5">
                    <input type="email" placeholder="Email" className="w-full p-3 border rounded-full focus:ring-2 focus:ring-orange-500" />
                    <input type="password" placeholder="Mật khẩu" className="w-full p-3 border rounded-full" />
                    <input type="password" placeholder="Nhập lại mật khẩu" className="w-full p-3 border rounded-full" />

                    <div className="flex items-center space-x-2 px-2">
                        <input type="checkbox" id="terms" className="accent-orange-600" />
                        <label htmlFor="terms" className="text-xs">Tôi đồng ý với <span className="text-orange-600 underline">Điều khoản sử dụng dịch vụ</span></label>
                    </div>

                    <button className="w-full bg-orange-600 text-white font-bold py-3 rounded-full mt-4">
                        Đăng ký
                    </button>
                </form>
                <p className="text-center mt-6 text-sm">Bạn đã có tài khoản? <Link to="/login" className="text-orange-600 font-bold">Đăng nhập</Link></p>
            </div>
        </div>
    );
};

export default Register;