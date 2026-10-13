const crypto = require('node:crypto');

// Math.random() is predictable and must not be used for security codes.
// crypto.randomInt is cryptographically secure. Returns a 6 digit string.
const generateOTP = () => String(crypto.randomInt(100000, 1000000));

module.exports = generateOTP;
