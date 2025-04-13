'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EncryptionKey extends Model {
    static associate(models) {
      // No associations needed for encryption keys
    }
  }
  EncryptionKey.init({
    key_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    key_value: {
      type: DataTypes.STRING(64),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'EncryptionKey',
    tableName: 'encryption_keys',
    underscored: true,
    timestamps: true,
    updatedAt: false
  });
  return EncryptionKey;
};