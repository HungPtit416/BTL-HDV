import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, User, ChevronLeft, MapPin, Phone, DollarSign } from 'lucide-react';
import { useCart } from '../context/CartContext';

const ORDER_SERVICE_BASE_URL = 'http://localhost:3003';
const PAYMENT_SERVICE_BASE_URL = 'http://localhost:3005';
const USER_SERVICE_BASE_URL = 'http://localhost:3001';

const Checkout = () => {
    const navigate = useNavigate();
    const { cartItems, totalPrice, clearCart, isHydrated } = useCart();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        district: '',
        ward: '',
        notes: '',
        paymentMethod: 'vnpay'
    });

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            setFormData(prev => ({
                ...prev,
                fullName: userData.name || '',
                email: userData.email || ''
            }));
        }

        if (isHydrated && !loading && cartItems.length === 0) {
            alert("Giỏ hàng trống!");
            navigate('/cart');
        }
    }, [cartItems, navigate, loading, isHydrated]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.fullName || !formData.phone || !formData.address || !formData.city) {
            alert("Vui lòng điền đầy đủ thông tin!");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const authConfig = {
                headers: { Authorization: `Bearer ${token}` }
            };

            // VNPay: nếu đã có đơn PENDING cùng số tiền thì tái dùng đơn đó thay vì tạo đơn mới
            if (formData.paymentMethod === 'vnpay') {
                const ordersRes = await axios.get(`${ORDER_SERVICE_BASE_URL}/api/orders`, authConfig);
                const orders = ordersRes.data?.data || [];
                const reusablePendingOrder = orders.find((order) => (
                    String(order.status || '').toUpperCase() === 'PENDING'
                    && Number(order.payment_method_id) === 1
                    && Number(order.final_amount) === Number(totalPrice)
                ));

                if (reusablePendingOrder?.id) {
                    try {
                        const retryRes = await axios.post(
                            `${PAYMENT_SERVICE_BASE_URL}/api/payments/order/${reusablePendingOrder.id}/retry`,
                            { description: `Thanh toan don hang #${reusablePendingOrder.id}` },
                            authConfig
                        );
                        const retryPaymentUrl = retryRes.data?.data?.payment_url;
                        if (retryPaymentUrl) {
                            window.location.href = retryPaymentUrl;
                            return;
                        }
                    } catch (retryError) {
                        alert('Đã có đơn hàng chờ thanh toán nhưng không tạo lại được link thanh toán. Vui lòng thử lại sau.');
                        setLoading(false);
                        return;
                    }
                }
            }

            const fullAddress = [formData.address, formData.ward, formData.district, formData.city]
                .filter(Boolean)
                .join(', ');

            const addressRes = await axios.post(`${USER_SERVICE_BASE_URL}/api/users/addresses`, {
                name: formData.fullName,
                phone: formData.phone,
                email: formData.email,
                address: fullAddress
            }, authConfig);

            const shippingAddressId = addressRes.data?.data?.id;
            if (!shippingAddressId) {
                alert("Không tạo được địa chỉ giao hàng!");
                setLoading(false);
                return;
            }

            // 1) Đồng bộ giỏ local lên order-service
            await axios.delete(`${ORDER_SERVICE_BASE_URL}/api/cart/${user.id}/clear`, authConfig).catch(() => null);
            for (const item of cartItems) {
                await axios.post(`${ORDER_SERVICE_BASE_URL}/api/cart/items`, {
                    user_id: user.id,
                    product_id: item.id,
                    quantity: item.quantity
                }, authConfig);
            }

            // 2) Tạo đơn hàng bằng endpoint checkout của order-service
            const orderRes = await axios.post(`${ORDER_SERVICE_BASE_URL}/api/orders/checkout`, {
                user_id: user.id,
                shipping_address_id: shippingAddressId,
                payment_method: 'QR'
            }, authConfig);

            const orderId = orderRes.data.data?.order?.id;
            const paymentUrl = orderRes.data.data?.payment?.payment_url;

            if (!orderId) {
                alert("Lỗi tạo đơn hàng!");
                setLoading(false);
                return;
            }

            // 3) VNPay only
            if (paymentUrl) {
                window.location.href = paymentUrl;
            } else {
                alert("Lỗi tạo link thanh toán!");
                setLoading(false);
            }
        } catch (error) {
            console.error("Lỗi:", error);
            alert(error.response?.data?.error || "Lỗi tạo đơn hàng!");
            setLoading(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <p className="text-xl text-gray-500 mb-6">Giỏ hàng trống!</p>
                <Link to="/cart" className="text-orange-600 font-bold hover:text-orange-700">← Quay lại giỏ hàng</Link>
            </div>
        );
    }

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

                <h1 className="text-4xl font-black text-blue-900 mb-12">ĐẶT HÀNG</h1>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Thông tin giao hàng */}
                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                <h2 className="text-2xl font-black text-blue-900 mb-6 flex items-center gap-3">
                                    <MapPin size={28} /> THÔNG TIN GIAO HÀNG
                                </h2>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        name="fullName"
                                        placeholder="Họ tên"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none"
                                        required
                                    />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none"
                                        required
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Số điện thoại"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none"
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="city"
                                        placeholder="Tỉnh/Thành phố"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none"
                                        required
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                    <input
                                        type="text"
                                        name="district"
                                        placeholder="Quận/Huyện"
                                        value={formData.district}
                                        onChange={handleChange}
                                        className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                    <input
                                        type="text"
                                        name="ward"
                                        placeholder="Phường/Xã"
                                        value={formData.ward}
                                        onChange={handleChange}
                                        className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none"
                                    />
                                </div>

                                <input
                                    type="text"
                                    name="address"
                                    placeholder="Địa chỉ chi tiết"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none mt-4"
                                    required
                                />

                                <textarea
                                    name="notes"
                                    placeholder="Ghi chú thêm (nếu có)"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-600 outline-none mt-4"
                                />
                            </div>

                            {/* Phương thức thanh toán */}
                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                <h2 className="text-2xl font-black text-blue-900 mb-6 flex items-center gap-3">
                                    <DollarSign size={28} /> PHƯƠNG THỨC THANH TOÁN
                                </h2>

                                <div className="space-y-3">
                                    <label className="flex items-center p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-orange-600 transition" style={{ borderColor: formData.paymentMethod === 'vnpay' ? '#ff6b00' : '#e5e7eb' }}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="vnpay"
                                            checked={formData.paymentMethod === 'vnpay'}
                                            onChange={handleChange}
                                            className="w-4 h-4"
                                        />
                                        <span className="ml-3 font-bold text-gray-900">Thanh toán qua VNPay</span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Đang xử lý...' : 'ĐẶT HÀNG'}
                            </button>
                        </form>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 sticky top-24 space-y-6">
                            <h3 className="text-xl font-black text-blue-900 mb-4">CHI TIẾT ĐƠN HÀNG</h3>

                            {/* Items */}
                            <div className="max-h-64 overflow-y-auto space-y-3 pb-6 border-b border-gray-200">
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-start gap-4">
                                        <div className="flex gap-3 flex-1">
                                            <img
                                                src={item.image_url || 'https://images.unsplash.com/photo-1617083281297-af330b568710?q=80&w=300'}
                                                alt={item.title}
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 line-clamp-2">{item.title}</p>
                                                <p className="text-xs text-gray-600">x{item.quantity}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-orange-600">
                                            {new Intl.NumberFormat('vi-VN').format(item.price * item.quantity)}đ
                                        </p>
                                    </div>
                                ))}
                            </div>

                                    {/* Totals */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-gray-600">
                                    <span>Tạm tính:</span>
                                    <span className="font-bold">{new Intl.NumberFormat('vi-VN').format(totalPrice)}đ</span>
                                </div>
                                <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-black text-orange-600">
                                    <span>TỔNG:</span>
                                    <span>{new Intl.NumberFormat('vi-VN').format(totalPrice)}đ</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
