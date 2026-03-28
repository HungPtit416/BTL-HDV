const nodemailer = require('nodemailer');
const pool = require('../db');

const sendEmail = async (options) => {
    // 1. Cấu hình Transporter (Dùng Gmail hoặc Mailtrap để test)
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: `"HDV Shop" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    try {
        const info = await transporter.sendMail(mailOptions);

        // 2. Lưu Nhật ký vào bảng email_logs khi gửi thành công
        await pool.query(
            'INSERT INTO email_logs (to_email, subject, content, sent_at) VALUES ($1, $2, $3, $4)',
            [options.email, options.subject, options.message, new Date()]
        );

        return info;
    } catch (error) {
        // Lưu nhật ký ngay cả khi lỗi (sent_at sẽ là null)
        await pool.query(
            'INSERT INTO email_logs (to_email, subject, content) VALUES ($1, $2, $3)',
            [options.email, options.subject, options.message]
        );
        throw error;
    }
};

module.exports = sendEmail;