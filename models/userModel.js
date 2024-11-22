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
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true },
    mobilNumber: { type: Number, required: true },
    address: addressSchema, 
    role: { type: String, required: true, enum: ['admin', 'user'] }, 
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

// Create a Mongoose model
const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;
