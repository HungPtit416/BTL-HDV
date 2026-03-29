const ForgotPassword = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
            <div className="w-full max-w-md text-center">
                <div className="text-6xl text-orange-500 mb-4 flex justify-center">🔓</div>
                <h2 className="text-2xl font-bold text-orange-600 mb-2 uppercase">Quên mật khẩu ?</h2>
                <p className="text-gray-500 mb-8">Đừng lo lắng, chúng tôi sẽ hướng dẫn bạn đặt lại.</p>

                <form className="text-left">
                    <label className="text-orange-600 font-bold text-sm block mb-1">Email</label>
                    <input type="email" className="w-full border-b-2 border-orange-500 py-2 mb-8 focus:outline-none" />
                    <button className="w-full bg-orange-600 text-white py-3 rounded-full flex items-center justify-center gap-2 font-bold uppercase tracking-wider">
                        <span>✈️</span> Gửi Email
                    </button>
                </form>
            </div>
        </div>
    );
};
export default ForgotPassword; 