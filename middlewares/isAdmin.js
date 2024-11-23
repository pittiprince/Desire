const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const isAdmin = async (req, res, next) => {
    try {
        const token = req.headers.token;
        if (!token) {
            return res.status(401).send('Access Denied: No token provided');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const { email, role } = decoded;

        if (role !== 'admin') {
            return res.status(403).send('Access Denied: Admins only');
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).send('Admin not found');
        }
        req.user = user;

        next(); 
    } catch (error) {
        console.error(error);
        res.status(401).send('Invalid Token');
    }
};

module.exports = isAdmin;
