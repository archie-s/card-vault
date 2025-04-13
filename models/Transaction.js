'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.PaymentMethod, {
        foreignKey: 'payment_method_id'
      });
    }
  }
  Transaction.init({
    transaction_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payment_method_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'declined', 'refunded'),
      allowNull: false
    },
    transaction_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.STRING(255)
    },
    reference_number: {
      type: DataTypes.STRING(50),
      unique: true
    }
  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
    underscored: true,
  });
  return Transaction;
};