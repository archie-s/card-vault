const { Sequelize } = require('sequelize');
const config = require('./database.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: dbConfig.host,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging,
        dialectOptions: dbConfig.dialectOptions
    }
);

module.exports = sequelize;