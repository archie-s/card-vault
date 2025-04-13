'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Define associations here
      User.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role'
      });
      
      // Make sure models.Customer exists before creating the association
      if (models.Customer) {
        User.hasMany(models.Customer, {
          foreignKey: 'user_id',
          as: 'customers'
        });
      }
      
      // Make sure models.AuditLog exists before creating the association
      if (models.AuditLog) {
        User.hasMany(models.AuditLog, {
          foreignKey: 'user_id',
          as: 'audit_logs'
        });
      }
    }
  }
  
  User.init({
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true
  });
  
  return User;
};