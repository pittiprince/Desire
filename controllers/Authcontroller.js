const UserModel = require('../models/userModel');
const OtpModel = require('../models/otp-model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const inputValidation = require('../utils/inputValidation');
const generateOTP = require('../utils/otp-generator');
const sendOTP = require('../utils/sms');
const sendOTPEmail = require('../utils/mailer');

// Signup Controller
exports.signup = async (req, res) => {
    try {
        let isParsed = inputValidation(req.body, 'signup');
        if (isParsed) {
            const isPresent = await UserModel.findOne({ email: req.body.email });
            if (isPresent) {
                return res.status(400).send('User already present with the following email');
            }
            let hashedPassword = await bcrypt.hash(req.body.password, 5);
            let signupUser = await UserModel.create({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                mobilNumber: req.body.mobilNumber,
                address: req.body.address,
                role: req.body.role,
            });
            res.status(201).send(`${req.body.email} has been successfully signed up`);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};

// Login with Password Controller
exports.signInWithPassword = async (req, res) => {
    try {
        let isParsed = inputValidation(req.body, 'login');
        if (isParsed) {
            let userPresent = await UserModel.findOne({ email: req.body.email });
            if (!userPresent) return res.status(404).send('User with email is not present, please sign up');

            let passwordTrue = await bcrypt.compare(req.body.password, userPresent.password);
            if (!passwordTrue) return res.status(400).send('Password is Incorrect');

            let token = jwt.sign(
                { email: userPresent.email, role: userPresent.role },
                process.env.JWT_SECRET_KEY
            );
            res.status(200).json({
                msg: 'User has been successfully logged in',
                token,
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};

// Send OTP via SMS Controller
exports.sendOtpSMS = async (req, res) => {
    try {
        const emailSchema = z.object({ email: z.string().email() });
        const isParsed = emailSchema.safeParse(req.body.email);
        if (isParsed.success) {
            const isEmailPresent = await UserModel.findOne({ email: req.body.email });
            if (!isEmailPresent) return res.status(404).send('User with the provided email does not exist');

            let OTP = generateOTP();
            let message = `Dear ${isEmailPresent.name}, your OTP is ${OTP}. It is valid for 10 minutes.`;
            await sendOTP(isEmailPresent.mobilNumber, message);
            await OtpModel.create({ email: req.body.email, otp: OTP });
            res.status(200).send('OTP has been sent');
        } else {
            res.status(400).send('Invalid email format');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};

// Verify OTP Controller
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const otpRecord = await OtpModel.findOne({ email, otp });
        if (!otpRecord) return res.status(400).send('Invalid or expired OTP');
        
        await OtpModel.deleteOne({ email });
        res.status(200).send('OTP verified successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};

// Send OTP via Email Controller
exports.sendOtpEmail = async (req, res) => {
    try {
        const emailSchema = z.object({ email: z.string().email() });
        const isParsed = emailSchema.safeParse(req.body);
        if (isParsed.success) {
            const isEmailPresent = await UserModel.findOne({ email: req.body.email });
            if (!isEmailPresent) return res.status(404).send('Email not found, please sign up');

            let OTP = generateOTP();
            await sendOTPEmail(req.body.email, isEmailPresent.name, OTP);
            await OtpModel.create({ email: req.body.email, otp: OTP });
            res.status(200).send('OTP sent to your email');
        } else {
            res.status(400).send('Invalid email format');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};
