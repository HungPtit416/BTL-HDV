const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASSWORD } = require('../config/constants');

const sendOrderSuccessEmail = async ({ toEmail, orderId, amount, itemCount }) => {
  if (!toEmail || !EMAIL_USER || !EMAIL_PASSWORD) {
    console.warn('Skipping order email: missing toEmail or email credentials');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });

  const amountText = Number(amount).toLocaleString('vi-VN');
  await transporter.sendMail({
    from: `"HDV Shop" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `Dat hang thanh cong #${orderId}`,
    text: `Don hang #${orderId} da duoc tao thanh cong.\nSo luong san pham: ${itemCount}\nTong tien: ${amountText} VND.\nVui long thanh toan de hoan tat don hang.`,
  });
};

module.exports = {
  sendOrderSuccessEmail,
};
