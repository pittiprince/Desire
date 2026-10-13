const UserModel = require('../models/userModel');
const OtpModel = require('../models/otp-model');
const bcrypt = require('bcrypt');
const inputValidation = require('../utils/inputValidation');
const generateOTP = require('../utils/otp-generator');
const sendOTP = require('../utils/sms');
const sendOTPEmail = require('../utils/mailer');
const { signToken } = require('../utils/token');
const { safeEqual, hashOtp } = require('../utils/secure');

const BCRYPT_ROUNDS = 10;
const MAX_OTP_ATTEMPTS = 5;
// Compared against when the email is unknown so the response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const invalid = (res, errors) => res.status(400).json({ msg: 'Invalid input', errors });

// Signup Controller
exports.signup = async (req, res) => {
    const parsed = inputValidation(req.body, 'signup');
    if (!parsed.success) return invalid(res, parsed.errors);
    const { adminSecret, ...fields } = parsed.data;

    // FIX: the role used to come straight from the request, so anybody could sign up as an admin.
    // Everyone is a normal user. An admin account needs the server-side ADMIN_SIGNUP_SECRET.
    let role = 'user';
    if (adminSecret !== undefined) {
        const configured = process.env.ADMIN_SIGNUP_SECRET;
        if (!configured || !safeEqual(adminSecret, configured)) {
            return res.status(403).json({ msg: 'Invalid admin secret' });
        }
        role = 'admin';
    }

    if (await UserModel.findOne({ email: fields.email })) {
        return res.status(409).json({ msg: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(fields.password, BCRYPT_ROUNDS);
    try {
        await UserModel.create({ ...fields, password: hashedPassword, role });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ msg: 'A user with this email already exists' });
        }
        throw err;
    }
    return res.status(201).json({ msg: `${fields.email} has been successfully signed up`, role });
};

// Login with Password Controller
exports.signInWithPassword = async (req, res) => {
    const parsed = inputValidation(req.body, 'login');
    if (!parsed.success) return invalid(res, parsed.errors);
    const { email, password } = parsed.data;

    const user = await UserModel.findOne({ email });
    const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !passwordMatches) {
        // one generic message so attackers cannot tell which emails are registered
        return res.status(401).json({ msg: 'Invalid email or password' });
    }

    return res.status(200).json({ msg: 'User has been successfully logged in', token: signToken(user) });
};

// Shared by the SMS and the email OTP routes.
//   deliver(user, otp) sends the code through the chosen channel and throws when that fails.
async function issueOtp(req, res, deliver) {
    const parsed = inputValidation(req.body, 'otpRequest');
    if (!parsed.success) return invalid(res, parsed.errors);
    const { email } = parsed.data;

    const genericReply = { msg: 'If an account exists for this email, an OTP has been sent' };
    const user = await UserModel.findOne({ email });
    if (!user) {
        // same answer as success, so this route cannot be used to discover registered emails
        return res.status(200).json(genericReply);
    }

    // one new code per cooldown window (stops SMS / email bombing of a user)
    const cooldownMs = Number(process.env.OTP_RESEND_COOLDOWN_MS ?? 60000);
    const existing = await OtpModel.findOne({ email });
    if (existing && Date.now() - new Date(existing.createdAt).getTime() < cooldownMs) {
        return res.status(429).json({ msg: 'Please wait a minute before requesting another OTP' });
    }

    const otp = generateOTP();
    await OtpModel.deleteMany({ email }); // only the newest code is valid
    await OtpModel.create({ email, otp: hashOtp(email, otp), attempts: 0 });

    try {
        await deliver(user, otp);
    } catch (err) {
        await OtpModel.deleteMany({ email });
        console.error('OTP delivery failed:', err.message);
        return res.status(502).json({ msg: 'Could not send the OTP right now, please try again later' });
    }
    return res.status(200).json(genericReply);
}

// Send OTP via SMS Controller
// FIX: it validated the string req.body.email against an object schema, so it always failed with
// "Invalid email format" and SMS OTP could never be sent.
exports.sendOtpSMS = (req, res) => issueOtp(req, res, (user, otp) => {
    const message = `Dear ${user.name}, your OTP is ${otp}. It is valid for 10 minutes.`;
    return sendOTP(user.mobilNumber, message);
});

// Send OTP via Email Controller
exports.sendOtpEmail = (req, res) => issueOtp(req, res, (user, otp) => sendOTPEmail(user.email, user.name, otp));

// Verify OTP Controller
// FIX: it only said "verified" and never logged the user in. A correct code now returns a JWT.
exports.verifyOtp = async (req, res) => {
    const parsed = inputValidation(req.body, 'otpVerify');
    if (!parsed.success) return invalid(res, parsed.errors);
    const { email, otp } = parsed.data;

    const record = await OtpModel.findOne({ email });
    if (!record) {
        return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
        await OtpModel.deleteMany({ email });
        return res.status(429).json({ msg: 'Too many wrong attempts, please request a new OTP' });
    }
    if (!safeEqual(record.otp, hashOtp(email, otp))) {
        await OtpModel.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
        return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    await OtpModel.deleteMany({ email }); // a code works exactly once
    const user = await UserModel.findOne({ email });
    if (!user) {
        return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }
    return res.status(200).json({ msg: 'OTP verified, logged in successfully', token: signToken(user) });
};
