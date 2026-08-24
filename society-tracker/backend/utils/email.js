const nodemailer = require('nodemailer');
require('dotenv').config();

// Works with any SMTP free tier (Gmail app password, Brevo, Mailtrap, Resend SMTP, etc).
// Fill in the SMTP_* values in .env — see .env.example.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(to, subject, text) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
  } catch (err) {
    // Don't let a failed email break the API request — just log it.
    console.error('Email send failed:', err.message);
  }
}

module.exports = { sendEmail };
