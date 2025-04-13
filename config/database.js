require('dotenv').config();

const development = {
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cardvault',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: false
};

const production = {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
    }
};

module.exports = { development, production };
