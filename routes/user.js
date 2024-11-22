const express = require('express');
const { mongo, default: mongoose } = require('mongoose');
const { z } = require('zod')
const user = express.Router();
const UserModel = require('../models/userModel')
const bcrypt = require('bcrypt')
const inputValidaton = require('../utils/inputValidation')
const jwt = require('jsonwebtoken');
const e = require('express');
const generateOTP = require('../utils/otp-generator')
const sendOTP = require('../utils/sms')
const OtpModel = require('../models/otp-model')
const sendOTPEmail = require('../utils/mailer')

//signup
user.post('/signup', async (req, res) => {
    try {
        let isParsed = inputValidaton(req.body,'signup')
        if (isParsed){
            const isPresent = await UserModel.findOne({
                email: req.body.email
            })
            if (isPresent) {
                res.send('User already present with the following email')
            } else {
                let hashedPassword = await bcrypt.hash(req.body.password, 5)
                let signupUser = await UserModel.create({
                    name: req.body.name,
                    email: req.body.email,
                    password: hashedPassword,
                    mobilNumber: req.body.mobilNumber,
                    address: {
                        houseNumber: req.body.address.houseNumber,
                        streetNumber: req.body.address.streetNumber,
                        landmark: req.body.address.landmark,
                        city: req.body.address.city,
                        zipcode: req.body.address.zipcode,
                        state: req.body.address.state,
                        category: req.body.address.category
                    },
                    role: req.body.role
                })
                if(signupUser){
                    res.send(`${req.body.email} has been successfully signedup`)
                }
            }
        }
    } catch (err) {
        console.log(err)
    }
})

//login with password 
user.post('/signin/password' , async(req,res)=>{
try{
    let isParsed = inputValidaton(req.body,'login')
    if(isParsed){
        let userPresent = await UserModel.findOne({email:req.body.email})
        if(userPresent){
            let passwordTrue =  bcrypt.compare(req.body.password , userPresent.password)
            if(passwordTrue){
                let token = jwt.sign({
                    email:userPresent.email,
                    password:userPresent.password
                },process.env.JWT_SECRET_KEY)
                res.status(200).json({
                    msg: "user has been sucessfully logged In",
                    token: token
                })
            }else{
                res.send("Password is Incorrect")
            }
        }else{
            res.send("user with email is not present , please signup")
        }
    }

}catch(err){
    res.send(err)
}
})

//login with OTP-SMS
user.post('/signin/otp',async(req,res)=>{
try{
    console.log(`check 1`)
    const emailSchema = z.object({
        email: z.string().email(),
    });
    const isParsed = emailSchema.safeParse(req.body.email)
    if(isParsed){
        console.log(`check 2`)
        const isEmailPresent = await UserModel.findOne({email:req.body.email})
       
        if(isEmailPresent){
            console.log(`check 3`)
            let OTP = generateOTP()
            let phoneNumber =isEmailPresent.mobilNumber
            console.log(phoneNumber)
            const message = `Dear ${isEmailPresent.name}, your OTP for Desire-ecommerce is ${OTP}. This code is valid for 10 minutes. Please do not share it with anyone.`
            await sendOTP(phoneNumber,message)
            await OtpModel.create({
                email:isEmailPresent.email,
                otp:OTP,
            })
           res.send("otp has been sent")
        }
        if (!isEmailPresent) {
            return res.status(404).send("User with the provided email does not exist");
        }
    }
}catch(err){
    res.send(err)
}
})

//otp-verfication
user.post('/signin/Otp-verify',async(req,res)=>{
    try{
        const emailSchema = z.object({
            email: z.string().email(),
        });
        const isParsed = emailSchema.safeParse(req.body.email)
        if(isParsed){
            const { email, otp } = req.body;
            const otpRecord = await OtpModel.findOne({ email, otp });
            if (!otpRecord) {
                return res.status(400).send("Invalid or expired OTP");
            }
            await OtpModel.deleteOne({ email }); 
            res.status(200).send("OTP verified successfully");

        }
    }catch(err){
        res.send(err)
    }
})

user.post('/signin/otp-email',async(req,res)=>{
    try{
        const emailSchema = z.object({
            email: z.string().email(),
        });
        const isParsed = emailSchema.safeParse(req.body.email)
        if(isParsed){
            const isEmailPresent = await UserModel.findOne({email:req.body.email})
            if(isEmailPresent){
                let OTP = generateOTP()
                let name = isEmailPresent.name
                let email = isEmailPresent.email
                await sendOTPEmail(email,name,OTP)
                await OtpModel.create({
                    email:isEmailPresent.email,
                    otp:OTP,
                })
                res.send('OTP sent to your email')
            }
            if(!isEmailPresent){
                res.send("Email not found , please signup")
            }
        }
        if(!isParsed){
            res.send('Enter correct email')
        }
    }catch(err){
        res.send(err)
    }
})


user.post('/signin/otp-email-verify',async(req,res)=>{
    try{
        const emailSchema = z.object({
            email: z.string().email(),
        });
        const isParsed = emailSchema.safeParse(req.body.email)
        if(isParsed){
            const { email, otp } = req.body;
            const otpRecord = await OtpModel.findOne({ email, otp });
            if (!otpRecord) {
                return res.status(400).send("Invalid or expired OTP");
            }
            await OtpModel.deleteOne({ email }); 
            res.status(200).send("OTP verified successfully");

        }
    }catch(err){
        res.send(err)
    }
})

module.exports = user;