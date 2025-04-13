'use strict';

const bcrypt = require('bcrypt');
const { User, Role } = require('../models');
const jwt = require('jsonwebtoken');

// Load JWT secret from environment or use a default for development
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development';

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({
      where: { username },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['role_name']
      }]
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Update last login time
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username,
        role: user.role.role_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success with token
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role.role_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

exports.checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (roles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }
  };
};