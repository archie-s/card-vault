'use strict';

const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('../models');

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth token provided or invalid format');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-for-development');
    
    // Find user with role
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, as: 'role' }]
    });
    
    if (!user) {
      console.log(`User not found: ${decoded.userId}`);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Add user to request
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Permission middleware
const requirePermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        console.log('User not authenticated in permission middleware');
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get user's role
      const role = req.user.role;
      
      if (!role) {
        console.log(`No role found for user ${req.user.username}`);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      console.log(`Checking permissions for user ${req.user.username} with role ${role.role_name}`);
      
      // Admin role has all permissions
      if (role.role_name === 'admin') {
        console.log('Admin role detected - granting all permissions');
        return next();
      }
      
      // Manager role has special permissions for cards
      if (role.role_name === 'manager' && 
          (requiredPermissions.includes('delete_payment_methods') || 
           requiredPermissions.includes('add_payment_methods') ||
           requiredPermissions.includes('update_payment_methods'))) {
        console.log('Manager role detected - granting card management permissions');
        return next();
      }
      
      // Customer can manage their own cards
      if (role.role_name === 'customer' && 
          (requiredPermissions.includes('delete_payment_methods') || 
           requiredPermissions.includes('add_payment_methods') ||
           requiredPermissions.includes('update_payment_methods'))) {
        console.log('Customer role detected - granting own card management permissions');
        return next();
      }
      
      // Get permissions for this role
      const permissions = await Permission.findAll({
        include: [{
          model: Role,
          where: { role_id: role.role_id }
        }]
      });
      
      const userPermissions = permissions.map(p => p.permission_name);
      
      console.log(`User ${req.user.username} has permissions: ${userPermissions.join(', ')}`);
      console.log(`Required permissions: ${requiredPermissions.join(', ')}`);
      
      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(perm => 
        userPermissions.includes(perm)
      );
      
      if (hasAllPermissions) {
        next();
      } else {
        console.log(`Permission denied for user ${req.user.username}`);
        res.status(403).json({ error: 'Access denied' });
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      res.status(500).json({ error: 'Server error during permission check' });
    }
  };
};

module.exports = { authMiddleware, requirePermission };