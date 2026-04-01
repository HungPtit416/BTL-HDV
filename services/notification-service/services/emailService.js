const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASSWORD } = require('../config/constants');

const sendPaymentSuccessEmail = async ({ toEmail, orderId, paymentId, amount, transactionId }) => {
  if (!toEmail || !EMAIL_USER || !EMAIL_PASSWORD) {
    const err = new Error('Missing recipient or SMTP credentials');
    err.status = 500;
    throw err;
  }

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });

  const amountText = Number(amount || 0).toLocaleString('vi-VN');
  await transporter.sendMail({
    from: `"HDV Shop" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `Thanh toan thanh cong #${orderId}`,
    text: `Thanh toan don hang #${orderId} thanh cong.\nMa payment: ${paymentId}\nSo tien: ${amountText} VND\nMa giao dich: ${transactionId || 'N/A'}`,
  });
};

module.exports = {
  sendPaymentSuccessEmail,
};
