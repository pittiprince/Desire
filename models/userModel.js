const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const addressSchema = new Schema({
    houseNumber: { type: Number, required: true },
    streetNumber: { type: Number, required: true },
    landmark: { type: String, required: false },
    city: { type: String, required: true },
    zipcode: { type: String, required: true },
    state: { type: String, required: true },
    category: { type: String, required: false }, // This could be something like 'Home', 'Work', etc.
}, { _id: false }); // _id: false disables creating an ID for the sub-document

const userSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    // kept under its original (misspelled) name so existing documents keep working;
    // text instead of Number so leading zeros and a "+" country code survive
    mobilNumber: { type: String, required: true },
    address: addressSchema,
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

// Create a Mongoose model
const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;
