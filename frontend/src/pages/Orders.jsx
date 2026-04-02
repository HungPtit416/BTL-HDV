import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ORDER_SERVICE_BASE_URL = 'http://localhost:3003';
const money = (v) => `${new Intl.NumberFormat('vi-VN').format(Number(v || 0))}đ`;

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const visibleOrders = orders.filter((order) => {
    const status = String(order?.status || '').toUpperCase();
    return status === 'PAID' || status.includes('PENDING');
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await axios.get(`${ORDER_SERVICE_BASE_URL}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setOrders(res.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Không lấy được danh sách đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải danh sách đơn hàng...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-blue-900">Đơn hàng của tôi</h1>
          <Link to="/" className="text-orange-600 font-bold">Về trang chủ</Link>
        </div>

        {error && <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 font-bold">{error}</div>}

        {visibleOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">Chưa có đơn hàng ở trạng thái PAID hoặc PENDING.</div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition"
              >
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="text-lg font-black text-blue-900">Đơn #{order.id}</p>
                    <p className="text-sm text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Trạng thái</p>
                    <p className="font-black text-orange-600">{order.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Tổng tiền</p>
                    <p className="font-black text-blue-900">{money(order.final_amount)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
