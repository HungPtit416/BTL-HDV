import { useState } from 'react';
import { Link } from 'react-router-dom';

const Login = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex w-full max-w-6xl h-[600px] shadow-2xl rounded-2xl overflow-hidden">
                {/* Bên trái: Hình ảnh */}
                <div className="hidden md:block w-1/2 bg-cover bg-center"
                    style={{ backgroundImage: "url('https://path-to-your-badminton-image.jpg')" }}>
                </div>

                {/* Bên phải: Form */}
                <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
                    <h2 className="text-3xl font-bold text-blue-900 mb-8">Đăng nhập</h2>
                    <form className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Email</label>
                            <input type="email" placeholder="Email"
                                className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Mật khẩu</label>
                            <div className="relative">
                                <input type="password" placeholder="Password"
                                    className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500" />
                                <span className="absolute right-4 top-3 cursor-pointer text-gray-400">👁️</span>
                            </div>
                            <div className="text-right mt-2">
                                <Link to="/forgotpassword" size="sm" className="text-orange-600 text-sm font-medium">Quên mật khẩu?</Link>
                            </div>
                        </div>
                        <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-full transition duration-300">
                            Đăng nhập
                        </button>
                    </form>
                    <p className="mt-8 text-center text-sm">
                        Bạn mới biết đến FBShop? <Link to="/register" className="text-orange-600 font-bold">Đăng ký</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
export default Login;