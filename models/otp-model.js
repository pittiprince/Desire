const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otp: { type: String, required: true },          // HMAC hash of the code, never the code itself
    attempts: { type: Number, default: 0 },         // wrong guesses so far; the code is dropped after too many
    createdAt: { type: Date, default: Date.now, expires: 600 }, // TTL of 10 minutes
});

const OtpModel = mongoose.model('Otp', otpSchema);

module.exports = OtpModel;
