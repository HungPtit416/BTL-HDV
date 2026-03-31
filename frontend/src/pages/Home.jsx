import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, ShoppingCart, LogOut, User } from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // 1. Kiểm tra trạng thái đăng nhập
        const savedUser = localStorage.getItem('user');
        if (savedUser) setUser(JSON.parse(savedUser));

        const fetchData = async () => {
            try {
                const [resProducts, resCats] = await Promise.all([
                    axios.get('http://localhost:3001/api/articles'),
                    axios.get('http://localhost:3001/api/categories').catch(() => ({ data: { data: [] } }))
                ]);
                setProducts(resProducts.data.data || []);
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    const addToWishlist = async (productId) => {
        if (!user) return alert("Vui lòng đăng nhập để thêm vào yêu thích!");
        try {
            await axios.post('http://localhost:3001/api/wishlist', {
                user_id: user.id,
                product_id: productId
            });
            alert("Đã thêm vào danh sách yêu thích! ❤️");
        } catch (err) {
            alert("Sản phẩm đã có trong wishlist hoặc lỗi hệ thống.");
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* --- NAVBAR --- */}
            <nav className="bg-white shadow-sm sticky top-0 z-50">
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

            {/* --- HERO SECTION --- */}
            <div className="relative h-[450px] bg-blue-900">
                <div className="absolute inset-0 bg-black/30 z-10"></div>
                <img
                    src="https://images.unsplash.com/photo-1626225967045-2c77c125b211?q=80&w=2070"
                    className="absolute inset-0 w-full h-full object-cover"
                    alt="Badminton Banner"
                />
                <div className="relative z-20 max-w-7xl mx-auto h-full flex flex-col justify-center px-8 text-white">
                    <h1 className="text-6xl font-black mb-4 uppercase italic">
                        Sale Chạm Đỉnh <br /> <span className="text-orange-500">Giảm Đến 50%</span>
                    </h1>
                    <button className="w-fit bg-orange-600 hover:bg-orange-700 px-10 py-4 rounded-full font-black transition transform hover:scale-105 shadow-xl">
                        XEM BỘ SƯU TẬP
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* --- CATEGORIES --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
                    {categories.map((cat) => (
                        <div key={cat.id} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-orange-100 hover:shadow-xl transition-all text-center cursor-pointer border border-gray-100 group">
                            <div className="text-4xl mb-3 group-hover:scale-125 transition duration-300">
                                {cat.icon || '🏸'}
                            </div>
                            <span className="font-black text-blue-900 group-hover:text-orange-600 uppercase text-sm tracking-wide">
                                {cat.name}
                            </span>
                        </div>
                    ))}
                </div>

                {/* --- PRODUCTS --- */}
                <div className="flex justify-between items-center mb-10">
                    <h2 className="text-3xl font-black text-blue-900 uppercase italic">Sản phẩm mới</h2>
                    <div className="h-1 flex-1 mx-8 bg-gray-200 rounded-full hidden md:block"></div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.map((item) => (
                            <div key={item.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-50 group relative">
                                <button
                                    onClick={() => addToWishlist(item.id)}
                                    className="absolute top-5 right-5 z-10 bg-white/90 p-2.5 rounded-full shadow-md hover:bg-orange-600 hover:text-white transition-all text-gray-400"
                                >
                                    <Heart size={18} fill={item.isWishlisted ? "currentColor" : "none"} />
                                </button>

                                <div className="h-64 overflow-hidden bg-gray-100">
                                    <img
                                        src={item.image_url || 'https://images.unsplash.com/photo-1617083281297-af330b568710?q=80&w=1000'}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                                        alt={item.title}
                                    />
                                </div>

                                <div className="p-6">
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2">
                                        {item.category_name || 'Yonex Special'}
                                    </p>
                                    <h3 className="font-bold text-blue-900 text-lg leading-tight mb-4 line-clamp-2 h-14">
                                        {item.title}
                                    </h3>
                                    <div className="flex justify-between items-center">
                                        <span className="text-2xl font-black text-blue-900">
                                            {new Intl.NumberFormat('vi-VN').format(item.price || 1250000)}đ
                                        </span>
                                        <button className="bg-orange-600 text-white p-3 rounded-2xl hover:bg-blue-900 transition-colors shadow-lg shadow-orange-200">
                                            <ShoppingCart size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;