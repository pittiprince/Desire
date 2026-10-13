const crypto = require('node:crypto');

// Constant-time string comparison (hashing first makes both sides the same length).
function safeEqual(a, b) {
    const hashA = crypto.createHash('sha256').update(String(a)).digest();
    const hashB = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(hashA, hashB);
}

// OTPs are stored hashed (HMAC), so a leaked database does not reveal live codes.
function hashOtp(email, otp) {
    const secret = process.env.OTP_SECRET || process.env.JWT_SECRET_KEY;
    return crypto.createHmac('sha256', secret).update(`otp:${email}:${otp}`).digest('hex');
}

module.exports = { safeEqual, hashOtp };
