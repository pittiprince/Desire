const axios = require('axios');

// Fast2SMS expects 10 digit Indian numbers: drop "+", spaces and a leading 91.
function normalizeNumber(phoneNumber) {
    const digits = String(phoneNumber).replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

// Throws when the SMS cannot be sent, so the caller can tell the user instead of
// silently pretending an OTP was delivered.
async function sendOTP(phoneNumber, message) {
    if (!process.env.smsApi) {
        throw new Error('smsApi (Fast2SMS key) is not configured');
    }
    const url = 'https://www.fast2sms.com/dev/bulkV2';
    const data = {
        route: 'q', // quick transactional route
        message,
        language: 'english',
        numbers: normalizeNumber(phoneNumber)
    };
    try {
        await axios.post(url, data, {
            headers: { authorization: process.env.smsApi, 'Content-Type': 'application/json' },
            timeout: 10000
        });
    } catch (error) {
        const detail = error.response ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`SMS provider error: ${detail}`);
    }
    // no phone number or OTP is logged on purpose
}

module.exports = sendOTP;
