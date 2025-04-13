'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    static associate(models) {
      Address.belongsTo(models.Customer, {
        foreignKey: 'customer_id'
      });
    }
  }
  Address.init({
    address_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    address_type: {
      type: DataTypes.ENUM('billing', 'shipping'),
      allowNull: false
    },
    street: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(50)
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Address',
    tableName: 'addresses',
    underscored: true,
  });
  return Address;
};