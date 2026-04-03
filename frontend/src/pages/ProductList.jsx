import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Heart, ShoppingCart, LogOut, User, Search, ClipboardList } from 'lucide-react';
import { useCart } from '../context/CartContext';

const ORDER_SERVICE_BASE_URL = 'http://localhost:3003';

const ProductList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart, cartItems, clearCart } = useCart();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [wishlist, setWishlist] = useState([]);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) setUser(JSON.parse(savedUser));

        const fetchData = async () => {
            try {
                const [resProducts, resCats] = await Promise.all([
                    axios.get('http://localhost:3002/api/products'),
                    axios.get('http://localhost:3002/api/categories').catch(() => ({ data: { data: [] } }))
                ]);
                // Map product-service fields to frontend format
                const mappedProducts = (resProducts.data.data || []).map(p => ({
                    ...p,
                    title: p.name,
                    price: parseFloat(p.export_price),
                    original_price: parseFloat(p.import_price),
                    category_name: p.category_name || 'Sản phẩm'
                }));
                setProducts(mappedProducts);
                setCategories(resCats.data.data.length > 0 ? resCats.data.data : [
                    { id: 1, name: 'Vợt Cầu Lông', icon: '🏸' },
                    { id: 2, name: 'Giày Cầu Lông', icon: '👟' },
                    { id: 3, name: 'Áo Quần', icon: '👕' },
                    { id: 4, name: 'Phụ Kiện', icon: '🎒' }
                ]);
            } catch (err) {
                console.error("Lỗi lấy dữ liệu:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const paymentStatus = String(params.get('payment_status') || '').toUpperCase();
        const orderId = params.get('order_id');

        if (!paymentStatus) return;

        const alertKey = `payment_alert:${paymentStatus}:${orderId || ''}`;
        if (sessionStorage.getItem(alertKey) === '1') {
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        sessionStorage.setItem(alertKey, '1');
        window.history.replaceState({}, document.title, window.location.pathname);

        if (paymentStatus === 'PAID') {
            alert(`Đặt hàng thành công${orderId ? ` (Đơn #${orderId})` : ''}`);
            clearCart();
            localStorage.removeItem('cart');

            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            const currentUser = savedUser ? JSON.parse(savedUser) : null;
            if (token && currentUser?.id) {
                axios.delete(`${ORDER_SERVICE_BASE_URL}/api/cart/${currentUser.id}/clear`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => null);
            }
            return;
        }

        if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
            alert('Thanh toán chưa thành công. Đơn hàng của bạn đang ở trạng thái PENDING trong Order List.');
        }
    }, [location.search, clearCart]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    const toggleWishlist = async (productId) => {
        if (!user) {
            alert("Vui lòng đăng nhập để thêm vào yêu thích!");
            navigate('/login');
            return;
        }

        if (wishlist.includes(productId)) {
            setWishlist(wishlist.filter(id => id !== productId));
        } else {
            setWishlist([...wishlist, productId]);
        }
    };

    const handleAddToCart = (product) => {
        addToCart(product, 1);
        alert("Đã thêm vào giỏ hàng! 🛒");
    };

    const filteredProducts = products.filter(product => {
        const matchCategory = !selectedCategory || product.category_id === selectedCategory;
        const matchSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCategory && matchSearch;
    });

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* --- NAVBAR --- */}
            <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    {/* Logo + Cart + User */}
                    <div className="flex justify-between items-center mb-4">
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

                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-600"
                        />
                    </div>

                    {/* Menu */}
                    <div className="flex gap-6 mt-4 text-sm font-bold text-gray-600 uppercase tracking-wider overflow-x-auto pb-2">
                        <button 
                            onClick={() => setSelectedCategory(null)} 
                            className={`pb-2 border-b-2 transition whitespace-nowrap ${!selectedCategory ? 'border-orange-600 text-orange-600' : 'border-transparent hover:text-blue-900'}`}
                        >
                            Tất cả
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`pb-2 border-b-2 transition whitespace-nowrap ${selectedCategory === cat.id ? 'border-orange-600 text-orange-600' : 'border-transparent hover:text-blue-900'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* --- HERO --- */}
            <div className="relative h-80 bg-gradient-to-r from-blue-900 to-orange-600 overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1626225967045-2c77c125b211?q=80&w=2070")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}></div>
                <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-8 text-white">
                    <h1 className="text-6xl font-black mb-4 uppercase italic">
                        Sale Chạm Đỉnh <br /> <span className="text-yellow-300">Giảm Đến 50%</span>
                    </h1>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Products */}
                {loading ? (
                    <div className="flex justify-center py-32">
                        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-3xl font-black text-blue-900 mb-8 uppercase">
                            {selectedCategory || searchTerm ? 'Kết quả tìm kiếm' : 'Tất cả sản phẩm'} ({filteredProducts.length})
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {filteredProducts.map((item) => (
                                <div key={item.id} className="bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-50 group relative">
                                    {/* Wishlist Button */}
                                    <button
                                        onClick={() => toggleWishlist(item.id)}
                                        className="absolute top-5 right-5 z-10 bg-white/90 p-2.5 rounded-full shadow-md hover:bg-orange-600 hover:text-white transition-all text-gray-400"
                                    >
                                        <Heart size={18} fill={wishlist.includes(item.id) ? "currentColor" : "none"} />
                                    </button>

                                    {/* Image */}
                                    <div className="h-64 overflow-hidden bg-gray-100 cursor-pointer" onClick={() => navigate(`/product/${item.id}`)}>
                                        <img
                                            src={item.image_url || 'https://images.unsplash.com/photo-1617083281297-af330b568710?q=80&w=1000'}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="p-6">
                                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.2em] mb-2">
                                            {item.category_name || 'Yonex'}
                                        </p>
                                        <h3 className="font-bold text-blue-900 text-sm leading-tight mb-4 line-clamp-2 h-10 cursor-pointer hover:text-orange-600" onClick={() => navigate(`/product/${item.id}`)}>
                                            {item.title}
                                        </h3>

                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-2xl font-black text-blue-900">
                                                    {new Intl.NumberFormat('vi-VN').format(parseFloat(item.price))}đ
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleAddToCart(item)}
                                                className="bg-orange-600 text-white p-3 rounded-2xl hover:bg-blue-900 transition-colors shadow-lg shadow-orange-200"
                                            >
                                                <ShoppingCart size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredProducts.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-xl text-gray-500 font-bold">Không tìm thấy sản phẩm nào 😞</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductList;
