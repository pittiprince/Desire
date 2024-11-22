const transporter = require('../config/mail');

const sendOTPEmail = async (email, name, otp) => {
    try {
        const mailOptions = {
            from: '"Desire Ecommerce" <service.desireecommerce@gmail.com>', // Sender address
            to: email, // Recipient address
            subject: 'Your OTP Code', // Subject
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <h1 style="color: #007bff; text-align: center;">Your OTP Code</h1>
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>Your OTP for Desire-Ecommerce is:</p>
                    <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; text-align: center;">
                        <h2 style="color: #007bff; margin: 0; font-size: 24px;">${otp}</h2>
                    </div>
                    <p style="margin-top: 20px;">
                        This code is valid for <strong>10 minutes</strong>. Please do not share it with anyone.
                    </p>
                    <p>If you did not request this, please ignore this email or contact our support team.</p>
                    <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        © 2024 Desire Ecommerce. All rights reserved.
                    </p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = sendOTPEmail;
