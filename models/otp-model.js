const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 600 }, // TTL of 10 minutes
});

const OtpModel = mongoose.model('Otp', otpSchema);

module.exports = OtpModel;
