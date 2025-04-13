require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/card-vault',
    encryption: {
        key: process.env.ENCRYPTION_KEY
    },
    ivLength: 16,
    environment: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET,
    rateLimits: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
};
