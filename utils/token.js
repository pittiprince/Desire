const jwt = require('jsonwebtoken');

// One place that signs tokens, so password login and OTP login return identical tokens.
function signToken(user) {
    return jwt.sign(
        { id: String(user._id), email: user.email, role: user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
}

module.exports = { signToken };
