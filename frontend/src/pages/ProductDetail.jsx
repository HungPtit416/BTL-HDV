import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, ShoppingCart, LogOut, User, ChevronLeft, Star, Truck, Shield, RotateCcw, ClipboardList } from 'lucide-react';
import { useCart } from '../context/CartContext';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart, cartItems } = useCart();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [user, setUser] = useState(null);
    const [isWishlisted, setIsWishlisted] = useState(false);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) setUser(JSON.parse(savedUser));

        const fetchProduct = async () => {
            try {
                const res = await axios.get(`http://localhost:3002/api/products/${id}`);
                // Map product-service fields to frontend format
                const product = res.data.data || res.data;
                const mappedProduct = {
                    ...product,
                    title: product.name,
                    price: parseFloat(product.export_price),
                    original_price: parseFloat(product.import_price)
                };
                setProduct(mappedProduct);
                setLoading(false);
            } catch (err) {
                console.error("Lỗi lấy sản phẩm:", err);
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const availableQuantity = Math.max(0, Number(product?.quantity) || 0);
    const isOutOfStock = availableQuantity <= 0;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    const handleAddToCart = () => {
        if (isOutOfStock) {
            alert('Sản phẩm hiện đang hết hàng.');
            return;
        }

        if (quantity > 0 && quantity <= availableQuantity) {
            addToCart(product, quantity);
            alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng! 🛒`);
            setQuantity(1);
            return;
        }

        alert(`Chỉ còn ${availableQuantity} sản phẩm trong kho.`);
    };

    const toggleWishlist = () => {
        if (!user) {
            alert("Vui lòng đăng nhập!");
            navigate('/login');
            return;
        }
        setIsWishlisted(!isWishlisted);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <p className="text-xl text-gray-500 mb-6">Sản phẩm không tồn tại 😞</p>
                <Link to="/" className="text-orange-600 font-bold hover:text-orange-700">← Quay lại trang chủ</Link>
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
                        <Link to="/orders" className="group" title="Đơn hàng của tôi">
                            <div className="bg-blue-900 text-white p-2.5 rounded-full hover:bg-blue-800 transition-colors">
                                <ClipboardList size={22} />
                            </div>
                        </Link>

                        <Link to="/cart" className="relative group">
                            <div className="bg-orange-600 text-white p-2.5 rounded-full hover:bg-orange-700 transition-colors">
                                <ShoppingCart size={22} />
                            </div>
                            {cartItems.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                                    {cartItems.length}
                                </span>
                            )}
                        </Link>

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

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Button */}
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 mb-8 hover:text-orange-600 transition">
                    <ChevronLeft size={20} /> Quay lại
                </button>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Image */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 h-96 flex items-center justify-center">
                        <img
                            src={product.image_url || 'https://images.unsplash.com/photo-1617083281297-af330b568710?q=80&w=1000'}
                            alt={product.title}
                            className="w-full h-full object-contain p-8"
                        />
                    </div>

                    {/* Product Info */}
                    <div className="space-y-6">
                        {/* Badges */}
                        <div className="flex gap-3 items-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {isOutOfStock ? '✕ HẾT HÀNG' : '✓ CÓ HÀNG'}
                            </span>
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                Còn lại: {availableQuantity}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl font-black text-blue-900 leading-tight">
                            {product.title}
                        </h1>

                        {/* Rating */}
                        <div className="flex items-center gap-4">
                            <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <span className="text-gray-600 font-bold">(234 đánh giá)</span>
                        </div>

                        {/* Price */}
                        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-2xl border border-orange-100">
                            <p className="text-gray-600 text-sm mb-2">GIÁ HIỆN TẠI</p>
                            <div className="flex items-baseline gap-4">
                                <p className="text-5xl font-black text-orange-600">
                                    {new Intl.NumberFormat('vi-VN').format(parseFloat(product.price))}đ
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <p className="text-gray-800 leading-relaxed">
                                {product.description || product.content || 'Sản phẩm chất lượng cao, chính hãng 100%. Được bảo hành 12 tháng.'}
                            </p>
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-gray-700">Số lượng:</span>
                            <div className="flex items-center border border-gray-300 rounded-full bg-white">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={isOutOfStock}
                                    className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-orange-100 transition text-xl font-bold"
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    max={Math.max(1, availableQuantity)}
                                    value={quantity}
                                    onChange={(e) => {
                                        const next = parseInt(e.target.value, 10) || 1;
                                        setQuantity(Math.min(Math.max(1, next), Math.max(1, availableQuantity)));
                                    }}
                                    disabled={isOutOfStock}
                                    className="w-16 text-center border-0 focus:outline-none font-bold text-lg"
                                />
                                <button
                                    onClick={() => setQuantity(Math.min(Math.max(1, availableQuantity), quantity + 1))}
                                    disabled={isOutOfStock || quantity >= availableQuantity}
                                    className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-orange-100 transition text-xl font-bold"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-6">
                            <button
                                onClick={handleAddToCart}
                                disabled={isOutOfStock}
                                className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2 transform hover:scale-105"
                            >
                                <ShoppingCart size={24} /> THÊM VÀO GIỎ
                            </button>
                            <button
                                onClick={toggleWishlist}
                                className={`flex-1 font-black text-lg rounded-2xl py-4 border-2 transition-all ${isWishlisted ? 'bg-red-50 border-red-600 text-red-600' : 'bg-white border-gray-300 text-gray-600'}`}
                            >
                                <Heart size={24} className="mx-auto" fill={isWishlisted ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        {/* Benefits */}
                        <div className="space-y-3 pt-6 border-t border-gray-200">
                            <div className="flex gap-4">
                                <Truck className="text-orange-600 flex-shrink-0" size={24} />
                                <div>
                                    <p className="font-bold text-gray-900">Miễn phí vận chuyển</p>
                                    <p className="text-sm text-gray-600">Cho đơn hàng trên 500.000đ</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Shield className="text-blue-600 flex-shrink-0" size={24} />
                                <div>
                                    <p className="font-bold text-gray-900">100% chính hãng</p>
                                    <p className="text-sm text-gray-600">Bảo hành chính hãng 12 tháng</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <RotateCcw className="text-green-600 flex-shrink-0" size={24} />
                                <div>
                                    <p className="font-bold text-gray-900">Hoàn lại 100%</p>
                                    <p className="text-sm text-gray-600">Nếu không hài lòng trong 30 ngày</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
