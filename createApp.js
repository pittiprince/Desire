const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const userRoutes = require('./routes/user');
const productsRoutes = require('./routes/Products');

// Builds the Express app without starting a server, so tests can import it.
function createApp() {
    const app = express();

    // behind Render's proxy: needed so rate limiting sees the real client IP
    app.set('trust proxy', 1);

    app.use(helmet());

    // CORS_ORIGIN can be a comma separated list, e.g. https://my-shop.vercel.app
    // All origins are allowed when it is not set (fine for a demo API that uses bearer tokens).
    const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
        : true;
    app.use(cors({ origin: allowedOrigins }));

    app.use(express.json({ limit: '100kb' }));
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

    // used by the hosting platform's health check
    app.get('/health', (req, res) => res.status(200).json({ ok: true }));

    // demo console (proof of work UI) served at /
    app.use(express.static(require('path').join(__dirname, 'public')));

    app.use('/user', userRoutes);
    app.use('/Products', productsRoutes);

    app.use((req, res) => res.status(404).json({ msg: 'Route not found' }));

    // central error handler for invalid JSON, database errors and anything thrown in a route
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        if (err.type === 'entity.parse.failed') return res.status(400).json({ msg: 'Request body is not valid JSON' });
        if (err.type === 'entity.too.large') return res.status(413).json({ msg: 'Request body too large' });
        console.error(err);
        return res.status(500).json({ msg: 'Internal server error' });
    });

    return app;
}

module.exports = createApp;
