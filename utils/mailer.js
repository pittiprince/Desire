const transporter = require('../config/mail');

// The user's name comes from signup, so it is escaped before it goes into the HTML email.
const escapeHtml = (text) => String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Throws when the email cannot be sent (previously the error was swallowed, so the API
// still answered "OTP sent" even though nothing was delivered).
const sendOTPEmail = async (email, name, otp) => {
    const mailOptions = {
        from: `"Desire Ecommerce" <${process.env.EMAIL}>`,
        to: email,
        subject: 'Your OTP Code',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h1 style="color: #007bff; text-align: center;">Your OTP Code</h1>
                <p>Dear <strong>${escapeHtml(name)}</strong>,</p>
                <p>Your OTP for Desire-Ecommerce is:</p>
                <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; text-align: center;">
                    <h2 style="color: #007bff; margin: 0; font-size: 24px;">${escapeHtml(otp)}</h2>
                </div>
                <p style="margin-top: 20px;">
                    This code is valid for <strong>10 minutes</strong>. Please do not share it with anyone.
                </p>
                <p>If you did not request this, please ignore this email or contact our support team.</p>
                <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="font-size: 14px; color: #666; text-align: center;">
                    &copy; ${new Date().getFullYear()} Desire Ecommerce. All rights reserved.
                </p>
            </div>
        `
    };
    await transporter.sendMail(mailOptions);
};

module.exports = sendOTPEmail;
