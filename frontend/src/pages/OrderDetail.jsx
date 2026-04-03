import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const ORDER_SERVICE_BASE_URL = 'http://localhost:3003';
const USER_SERVICE_BASE_URL = 'http://localhost:3001';

const currency = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))}đ`;

const OrderDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await axios.get(`${ORDER_SERVICE_BASE_URL}/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orderData = res.data?.data || null;
        setOrder(orderData);

        if (orderData?.shipping_address_id) {
          try {
            const addrRes = await axios.get(
              `${USER_SERVICE_BASE_URL}/api/users/addresses/${orderData.shipping_address_id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setShippingAddress(addrRes.data?.data || null);
          } catch {
            setShippingAddress(null);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Không lấy được chi tiết đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, navigate]);

  useEffect(() => {
    const paymentStatus = String(searchParams.get('payment_status') || '').toUpperCase();
    if (paymentStatus !== 'PAID') return;

    const syncClearCart = async () => {
      clearCart();
      localStorage.removeItem('cart');

      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        if (token && user?.id) {
          await axios.delete(`${ORDER_SERVICE_BASE_URL}/api/cart/${user.id}/clear`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch {
        // Ignore server clear-cart failure; local cart has already been cleared.
      }
    };

    syncClearCart();
  }, [searchParams, clearCart]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải đơn hàng...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-600 font-bold">{error}</p>
        <Link to="/" className="text-orange-600 font-bold">Về trang chủ</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-gray-700 font-bold">Không tìm thấy đơn hàng</p>
        <Link to="/" className="text-orange-600 font-bold">Về trang chủ</Link>
      </div>
    );
  }

  const paymentStatus = searchParams.get('payment_status');

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-blue-900">Đơn hàng #{order.id}</h1>
            <p className="text-gray-500">Trạng thái: <span className="font-bold text-orange-600">{order.status}</span></p>
          </div>
          <a
            href="/"
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            Về trang chủ
          </a>
        </div>

        {paymentStatus && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-blue-900 font-bold">
            Kết quả thanh toán: {paymentStatus}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Tổng tiền</p>
            <p className="text-xl font-black text-orange-600">{currency(order.final_amount)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Địa chỉ giao hàng</p>
            {shippingAddress ? (
              <div className="text-gray-800 space-y-1">
                <p className="font-black">{shippingAddress.name}</p>
                <p className="font-semibold">{shippingAddress.phone}</p>
                {shippingAddress.email && <p className="font-medium">{shippingAddress.email}</p>}
                <p className="font-medium">{shippingAddress.address}</p>
              </div>
            ) : (
              <p className="font-bold text-gray-800">Mã địa chỉ: {order.shipping_address_id}</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-blue-900 mb-3">Sản phẩm</h2>
          <div className="space-y-2">
            {(order.items || []).map((item) => (
              <div key={item.id} className="border border-gray-100 rounded-xl p-4 flex justify-between gap-4">
                <div>
                  <p className="font-bold text-gray-900">{item.product_name || `Product ${item.product_id}`}</p>
                  <p className="text-sm text-gray-500">SL: {item.quantity} x {currency(item.unit_price)}</p>
                </div>
                <p className="font-black text-blue-900">{currency(item.total_price)}</p>
              </div>
            ))}
          </div>
        </div>

        {Array.isArray(order.payments) && order.payments.length > 0 && (
          <div>
            <h2 className="text-xl font-black text-blue-900 mb-3">Thanh toán</h2>
            <div className="space-y-2">
              {order.payments.map((payment) => (
                <div key={payment.id} className="border border-gray-100 rounded-xl p-4 flex justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900">{payment.provider || 'PAYMENT'}</p>
                    <p className="text-sm text-gray-500">Mã GD: {payment.transaction_id || 'N/A'}</p>
                  </div>
                  <p className="font-black text-orange-600">{payment.status}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
