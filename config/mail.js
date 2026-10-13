const nodemailer = require('nodemailer');

// Any SMTP provider (Brevo, Resend SMTP, Mailgun, ...) when SMTP_HOST is set; otherwise Gmail with an app password.
const transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    })
    : nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD }
    });

module.exports = transporter;
