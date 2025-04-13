'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      Customer.belongsTo(models.User, {
        foreignKey: 'user_id'
      });
      Customer.hasMany(models.Address, {
        foreignKey: 'customer_id'
      });
      Customer.hasMany(models.PaymentMethod, {
        foreignKey: 'customer_id'
      });
    }
  }
  Customer.init({
    customer_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    phone: {
      type: DataTypes.STRING(20)
    },
    user_id: {
      type: DataTypes.INTEGER
    }
  }, {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',
    underscored: true,
  });
  return Customer;
};