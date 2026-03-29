import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleReset = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:3001/api/users/resetpassword/${token}`, { password });
            alert('Đổi mật khẩu thành công!');
            navigate('/login');
        } catch (err) {
            alert('Link hết hạn hoặc không hợp lệ');
        }
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <h2>Nhập mật khẩu mới</h2>
            <form onSubmit={handleReset}>
                <input type="password" placeholder="Mật khẩu mới" onChange={(e) => setPassword(e.target.value)} required />
                <button type="submit">Cập nhật mật khẩu</button>
            </form>
        </div>
    );
};
export default ResetPassword;