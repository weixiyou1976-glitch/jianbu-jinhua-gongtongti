const nodemailer = require('nodemailer');
const dns = require('dns');

const SMTP_HOST = 'smtp.qq.com';

let transporterPromise = null;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = dns.promises
      .lookup(SMTP_HOST, { family: 4 })
      .then(({ address }) =>
        nodemailer.createTransport({
          host: address,
          servername: SMTP_HOST,
          port: 465,
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 15000,
        })
      )
      .catch((err) => {
        transporterPromise = null;
        throw err;
      });
  }
  return transporterPromise;
}

async function sendVerificationEmail(email, code) {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: `"渐步进化共同体" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '渐步体验验证码',
    text: `您好，您的渐步体验验证码是：${code}，5分钟内有效，请勿泄露给他人。`,
  });
}

module.exports = { sendVerificationEmail };
