const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const config = require('../config');
const { authenticate, authorize, PERMISSIONS } = require('../middleware/auth');

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find the user with their role
        const user = await User.findOne({
            where: { username },
            include: [{ model: Role }]
        });

        if (!user || !user.verifyPassword(password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create token with the correct user ID field
        const token = jwt.sign(
            { 
                userId: user.user_id, // Make sure this matches your model's primary key
                role: user.Role.role_name // Make sure this matches your Role model's field name
            },
            config.jwtSecret || process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Set token as HTTP-only cookie for better security
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        res.json({
            token,
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.Role.role_name
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Create user (admin only)
router.post('/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { username, email, password, roleId } = req.body;

        const user = await User.create({
            username,
            email,
            passwordHash: User.hashPassword(password),
            roleId
        });

        res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            roleId: user.roleId
        });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Change password
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!req.user.verifyPassword(currentPassword)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        await req.user.update({
            passwordHash: User.hashPassword(newPassword)
        });

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    return res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;