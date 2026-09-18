const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
    });
  }
  return transporter;
}

async function sendVerificationEmail(email, code) {
  await getTransporter().sendMail({
    from: `"渐步进化共同体" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '渐步体验验证码',
    text: `您好，您的渐步体验验证码是：${code}，5分钟内有效，请勿泄露给他人。`,
  });
}

module.exports = { sendVerificationEmail };
