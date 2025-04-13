'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentMethod extends Model {
    static associate(models) {
      PaymentMethod.belongsTo(models.Customer, {
        foreignKey: 'customer_id'
      });
      PaymentMethod.hasMany(models.Transaction, {
        foreignKey: 'payment_method_id'
      });
    }
  }
  PaymentMethod.init({
    payment_method_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payment_type: {
      type: DataTypes.ENUM('credit', 'debit'),
      allowNull: false
    },
    card_holder_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    encrypted_card_number: {
      type: DataTypes.BLOB,
      allowNull: false
    },
    encrypted_cvv: {
      type: DataTypes.BLOB,
      allowNull: false
    },
    encrypted_expiry_date: {
      type: DataTypes.BLOB,
      allowNull: false
    },
    card_brand: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    last_four_digits: {
      type: DataTypes.CHAR(4),
      allowNull: false
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'PaymentMethod',
    tableName: 'payment_methods',
    underscored: true,
  });
  return PaymentMethod;
};