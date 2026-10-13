const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// Accepts `Authorization: Bearer <token>` (preferred) or the legacy `token` header.
function getToken(req) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
    return req.headers.token;
}

const isAdmin = async (req, res, next) => {
    const token = getToken(req);
    if (!token) {
        return res.status(401).json({ msg: 'Access denied: no token provided' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (error) {
        return res.status(401).json({ msg: 'Invalid or expired token' });
    }

    try {
        // Check the role stored in the database, not only the one inside the token, so a
        // user who was demoted or deleted loses admin access immediately.
        const user = await userModel.findOne({ email: decoded.email });
        if (!user) {
            return res.status(401).json({ msg: 'Account no longer exists' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: admins only' });
        }
        req.user = user;
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = isAdmin;
