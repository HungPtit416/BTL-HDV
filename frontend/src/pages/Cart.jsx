import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LogOut, User, Trash2, Plus, Minus, ChevronLeft, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

const Cart = () => {
    const navigate = useNavigate();
    const { cartItems, totalPrice, updateQuantity, removeFromCart } = useCart();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) setUser(JSON.parse(savedUser));
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    const handleCheckout = () => {
        if (!user) {
            alert("Vui lòng đăng nhập để thanh toán!");
            navigate('/login');
            return;
        }

        if (cartItems.length === 0) {
            alert("Giỏ hàng trống!");
            return;
        }

        navigate('/checkout');
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* --- NAVBAR --- */}
            <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                    <Link to="/" className="text-2xl font-black text-blue-900 tracking-tighter">
                        HDV<span className="text-orange-600">SHOP</span>
                    </Link>

                    <div className="flex items-center gap-6">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full">
                                    <User size={16} /> {user.name}
                                </div>
                                <button onClick={handleLogout} className="text-gray-500 hover:text-orange-600 transition">
                                    <LogOut size={20} />
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="bg-orange-600 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-orange-700 transition">
                                Đăng nhập
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Breadcrumb */}
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 mb-8 hover:text-orange-600 transition">
                    <ChevronLeft size={20} /> Quay lại
                </button>

                <h1 className="text-4xl font-black text-blue-900 mb-12 flex items-center gap-3">
                    <ShoppingCart size={40} /> GIỎ HÀNG ({cartItems.length})
                </h1>

                {cartItems.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
                        <div className="text-6xl mb-4">🛒</div>
                        <h2 className="text-3xl font-black text-blue-900 mb-3">Giỏ hàng trống</h2>
                        <p className="text-gray-600 text-lg mb-8">Hãy thêm sản phẩm để tiếp tục mua sắm!</p>
                        <Link to="/" className="inline-block bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 transform hover:scale-105">
                            Xem sản phẩm
                        </Link>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {cartItems.map((item) => (
                                <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                                    <div className="flex gap-6">
                                        {/* Image */}
                                        <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                                            <img
                                                src={item.image_url || 'https://images.unsplash.com/photo-1617083281297-af330b568710?q=80&w=1000'}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <h3 className="font-bold text-blue-900 text-lg mb-2 line-clamp-2">
                                                {item.title}
                                            </h3>
                                            <p className="text-2xl font-black text-orange-600 mb-4">
                                                {new Intl.NumberFormat('vi-VN').format(item.price)}đ
                                            </p>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-gray-600 font-bold">SỐ LƯỢNG:</span>
                                                <div className="flex items-center border border-gray-300 rounded-full bg-gray-50">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-10 h-10 flex items-center justify-center hover:bg-orange-100 transition"
                                                    >
                                                        <Minus size={18} className="text-gray-600" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            if (raw === '') return;
                                                            const next = Number(raw);
                                                            if (!Number.isInteger(next)) return;
                                                            updateQuantity(item.id, Math.max(1, next));
                                                        }}
                                                        className="w-14 text-center font-bold bg-transparent border-0 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-10 h-10 flex items-center justify-center hover:bg-orange-100 transition"
                                                    >
                                                        <Plus size={18} className="text-gray-600" />
                                                    </button>
                                                </div>

                                                {/* Remove Button */}
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50 p-3 rounded-full transition"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Total */}
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600 mb-2">TỔNG</p>
                                            <p className="text-2xl font-black text-blue-900">
                                                {new Intl.NumberFormat('vi-VN').format(item.price * item.quantity)}đ
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Checkout Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 sticky top-24 space-y-6">
                                <div>
                                    <p className="text-gray-600 text-sm uppercase font-bold mb-2">Tạm tính</p>
                                    <p className="text-3xl font-black text-blue-900">
                                        {new Intl.NumberFormat('vi-VN').format(totalPrice)}đ
                                    </p>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-gray-600 text-sm">TỔNG CỘNG</span>
                                        <p className="text-3xl font-black text-orange-600">
                                            {new Intl.NumberFormat('vi-VN').format(totalPrice)}đ
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 transform hover:scale-105"
                                >
                                    THANH TOÁN
                                </button>

                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition"
                                >
                                    Tiếp tục mua sắm
                                </button>

                                {/* Info Box */}
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                                    <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-900 font-bold">
                                        Bạn cần đăng nhập để thanh toán
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;
