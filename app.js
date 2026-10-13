require('dotenv').config();
const mongoose = require('mongoose');
const createApp = require('./createApp');

const REQUIRED_ENV = ['MongooseURL', 'JWT_SECRET_KEY'];
const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}
// optional features: warn instead of failing so the shop still runs without them
if (!process.env.smsApi) console.warn('smsApi is not set: SMS OTP login will not work');
if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) console.warn('EMAIL / EMAIL_PASSWORD are not set: email OTP login will not work');

// Hosting platforms (Render, Railway, ...) tell the app which port to use through PORT
const PORT = process.env.PORT || 3000;

const establishServer = async () => {
    try {
        await mongoose.connect(process.env.MongooseURL);
        console.log('Connected to MongoDB');
        if (process.env.SEED_DEMO === 'true') await require('./seed').seedDemoData();
        createApp().listen(PORT, '0.0.0.0', () => {
            console.log(`The server has been started on port ${PORT}`);
        });
    } catch (err) {
        console.error('Could not start the server:', err.message);
        process.exit(1);
    }
};

establishServer();
