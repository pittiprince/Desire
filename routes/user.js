const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const Authcontroller = require('../controllers/Authcontroller');
const asyncHandler = require('../utils/asyncHandler');

// Brute-force protection. Limits are per IP; AUTH_RATE_LIMIT / OTP_RATE_LIMIT override the defaults.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT) || 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});
// sending OTPs costs money (SMS) and can annoy users, so it gets a tighter limit
const otpSendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.OTP_RATE_LIMIT) || 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false
});

// Signup Route
router.post('/signup', authLimiter, asyncHandler(Authcontroller.signup));

// Login with Password
router.post('/signin/password', authLimiter, asyncHandler(Authcontroller.signInWithPassword));

// Login with OTP via SMS
router.post('/signin/otp', otpSendLimiter, asyncHandler(Authcontroller.sendOtpSMS));

// Send OTP via Email
router.post('/signin/otp-email', otpSendLimiter, asyncHandler(Authcontroller.sendOtpEmail));

// Verify OTP (returns a JWT)
router.post('/signin/otp-verify', authLimiter, asyncHandler(Authcontroller.verifyOtp));

module.exports = router;
