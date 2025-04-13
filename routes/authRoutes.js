'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Login route
router.post('/login', authController.login);

// Test protected route
router.get('/profile', authController.verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Protected route accessed successfully',
    user: req.user
  });
});

module.exports = router;