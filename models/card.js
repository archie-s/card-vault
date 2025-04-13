'use strict';
const { Model } = require('sequelize');

// Update the tableName in your Card model
module.exports = (sequelize, DataTypes) => {
  const Card = sequelize.define('Card', {
    card_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'customer_id'
      }
    },
    card_number_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    card_number_masked: {
      type: DataTypes.STRING(19),
      allowNull: false
    },
    expiry_month: {
      type: DataTypes.STRING(2),
      allowNull: false
    },
    expiry_year: {
      type: DataTypes.STRING(4),
      allowNull: false
    },
    cardholder_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'customer_cards', // Use the new table name
    sequelize,
    modelName: 'Card',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return Card;
};