const express = require('express');
const router = express.Router();
const Authcontroller = require('../controllers/Authcontroller');

// Signup Route
router.post('/signup', Authcontroller.signup);

// Login with Password
router.post('/signin/password', Authcontroller.signInWithPassword);

// Login with OTP via SMS
router.post('/signin/otp', Authcontroller.sendOtpSMS);

// Send OTP via Email
router.post('/signin/otp-email', Authcontroller.sendOtpEmail);

// Verify OTP
router.post('/signin/otp-verify', Authcontroller.verifyOtp);

module.exports = router;
