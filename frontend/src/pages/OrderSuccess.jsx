import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Clock, Mail, Phone } from 'lucide-react';
import { useCart } from '../context/CartContext';

const OrderSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const [orderStatus, setOrderStatus] = useState('loading'); // loading, success, failed, pending
    const [orderData, setOrderData] = useState(null);

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                const vnpCode = searchParams.get('vnp_ResponseCode');
                const orderId = searchParams.get('vnp_OrderInfo');

                if (!vnpCode || !orderId) {
                    setOrderStatus('failed');
                    return;
                }

                if (vnpCode === '00') {
                    // Thanh toán thành công: clear giỏ tại context + localStorage
                    clearCart();
                    localStorage.removeItem('cart');
                    setOrderData({ id: orderId });
                    setOrderStatus('success');
                } else {
                    setOrderStatus('failed');
                }
            } catch (err) {
                console.error("Lỗi:", err);
                setOrderStatus('failed');
            }
        };

        const status = searchParams.get('status');
        if (status === 'pending') {
            setOrderStatus('pending');
            setOrderData({ id: searchParams.get('orderId') });
        } else {
            verifyPayment();
        }
    }, [searchParams, clearCart]);

    if (orderStatus === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 to-orange-600 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {orderStatus === 'success' && (
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-12 text-center">
                            <CheckCircle size={80} className="mx-auto mb-6 drop-shadow-lg" />
                            <h1 className="text-4xl font-black mb-3">ĐẶT HÀNG THÀNH CÔNG!</h1>
                            <p className="text-green-100 text-lg font-bold">Cảm ơn bạn đã mua sắm tại HDV SHOP</p>
                        </div>

                        {/* Content */}
                        <div className="p-12">
                            {/* Order Info */}
                            <div className="bg-blue-50 rounded-2xl p-8 mb-8 border border-blue-200">
                                <h2 className="text-2xl font-black text-blue-900 mb-6">CHI TIẾT ĐƠN HÀNG</h2>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Mã đơn hàng</p>
                                        <p className="text-2xl font-black text-blue-900">{orderData?.id || 'N/A'}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Tổng tiền</p>
                                        <p className="text-2xl font-black text-orange-600">
                                            {orderData?.total_price ? new Intl.NumberFormat('vi-VN').format(orderData.total_price) : '0'}đ
                                        </p>
                                    </div>

                                    <div className="md:col-span-2">
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Địa chỉ giao hàng</p>
                                        <p className="text-gray-700 font-bold">{orderData?.shipping_address || 'N/A'}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Trạng thái</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                                            <span className="text-blue-900 font-bold">Chờ xác nhận</span>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Ngày tạo</p>
                                        <p className="text-gray-700 font-bold">
                                            {orderData?.created_at ? new Date(orderData.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Next Steps */}
                            <div className="bg-orange-50 rounded-2xl p-8 border border-orange-200 mb-8">
                                <h3 className="text-xl font-black text-orange-600 mb-4 flex items-center gap-3">
                                    <Clock size={24} /> BƯỚC TIẾP THEO
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-sm">1</div>
                                        <div>
                                            <p className="font-bold text-gray-900">Xác nhận đơn hàng</p>
                                            <p className="text-sm text-gray-600">Chúng tôi sẽ xác nhận đơn hàng của bạn trong vòng 2 giờ</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-sm">2</div>
                                        <div>
                                            <p className="font-bold text-gray-900">Chuẩn bị hàng</p>
                                            <p className="text-sm text-gray-600">Chúng tôi sẽ chuẩn bị hàng hóa và thông báo khi sẵn sàng gửi</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-sm">3</div>
                                        <div>
                                            <p className="font-bold text-gray-900">Giao hàng</p>
                                            <p className="text-sm text-gray-600">Hàng sẽ được gửi đến bạn trong 3-5 ngày làm việc</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 mb-8">
                                <h3 className="text-lg font-black text-blue-900 mb-4">LIÊN HỆ</h3>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Phone size={20} className="text-orange-600" />
                                        <div>
                                            <p className="text-xs text-gray-600 uppercase font-bold">Hotline</p>
                                            <p className="font-bold text-gray-900">0979.170.274</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Mail size={20} className="text-orange-600" />
                                        <div>
                                            <p className="text-xs text-gray-600 uppercase font-bold">Email</p>
                                            <p className="font-bold text-gray-900">support@hdvshop.com</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    to="/"
                                    className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 transition-all text-center transform hover:scale-105"
                                >
                                    ← Về Trang Chủ
                                </Link>
                            </div>

                            {/* Note */}
                            <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded text-yellow-800 text-sm">
                                <p className="font-bold mb-2">💡 Ghi chú quan trọng:</p>
                                <p>✓ Xác nhận đơn hàng sẽ được gửi qua email trong vòng 1 giờ</p>
                                <p>✓ Vui lòng kiểm tra thư rác nếu không tìm thấy email xác nhận</p>
                            </div>
                        </div>
                    </div>
                )}

                {orderStatus === 'failed' && (
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-12 text-center">
                            <AlertCircle size={80} className="mx-auto mb-6 drop-shadow-lg" />
                            <h1 className="text-4xl font-black mb-3">THANH TOÁN THẤT BẠI</h1>
                            <p className="text-red-100 text-lg font-bold">Vui lòng kiểm tra lại và thử lại</p>
                        </div>

                        <div className="p-12 text-center">
                            <p className="text-gray-600 mb-8 text-lg">Giao dịch của bạn không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ khách hàng.</p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    to="/checkout"
                                    className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 transition-all transform hover:scale-105"
                                >
                                    🔄 Thử Lại
                                </Link>

                                <Link
                                    to="/cart"
                                    className="flex-1 bg-gray-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-gray-600 transition-all transform hover:scale-105"
                                >
                                    ← Quay Lại Giỏ Hàng
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {orderStatus === 'pending' && (
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-12 text-center">
                            <Clock size={80} className="mx-auto mb-6 drop-shadow-lg animate-bounce" />
                            <h1 className="text-4xl font-black mb-3">ĐẶT HÀNG THÀNH CÔNG</h1>
                            <p className="text-blue-100 text-lg font-bold">Đơn hàng của bạn đã được tạo!</p>
                        </div>

                        <div className="p-12 text-center">
                            <p className="text-gray-600 mb-8 text-lg">Đơn hàng COD đã được ghi nhận. Chúng tôi sẽ xác nhận trong vòng 2 giờ.</p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    to="/"
                                    className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 transition-all"
                                >
                                    ← Về Trang Chủ
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderSuccess;
