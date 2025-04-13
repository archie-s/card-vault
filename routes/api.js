'use strict';

const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cardService = require('../services/cardService.js');
const { validateCard } = require('../utils/validate.js');
const rateLimit = require('express-rate-limit');
const config = require('../config/index.js');
const { User, Role, Card, Customer, Permission } = require('../models');
const { encrypt, decrypt } = require('../utils/encryption');
const sequelize = require('../config/sequelize.js');

// Apply rate limiting
const apiLimiter = rateLimit(config.rateLimits);
router.use(apiLimiter);

// Middleware for handling async errors
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Login route
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`Login attempt for username: ${username}`);
        
        // Find user with role
        const user = await User.findOne({
            where: { username },
            include: [{ model: Role, as: 'role' }]
        });
        
        if (!user) {
            console.log(`User not found: ${username}`);
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }
        
        console.log(`User found: ${user.username}, role: ${user.role?.role_name}`);

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        console.log(`Password validation result: ${validPassword}`);
        
        if (!validPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                userId: user.user_id,
                role: user.role.role_name
            },
            process.env.JWT_SECRET || 'your-secret-key-for-development',
            { expiresIn: '24h' }
        );

        // Send response with full user details
        res.json({
            success: true,
            token,
            user: {
                id: user.user_id,
                username: user.username,
                role: user.role.role_name,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false,
            error: 'An error occurred during login',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Add a password reset route for testing
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash the new password
    const password_hash = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await user.update({ password_hash });
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get current user's permissions - helps with debugging
router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    // Get permissions for this user's role
    const permissions = await Permission.findAll({
      include: [{
        model: Role,
        where: { role_id: req.user.role.role_id }
      }]
    });
    
    const userPermissions = permissions.map(p => p.permission_name);
    
    res.json({
      user: {
        id: req.user.user_id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role.role_name
      },
      permissions: userPermissions
    });
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Add user creation endpoint - before the authMiddleware
router.post('/auth/users', async (req, res) => {
    try {
        const { username, password, email, role_name = 'customer' } = req.body;

        // Find the role
        const role = await Role.findOne({ where: { role_name } });
        if (!role) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            username,
            password_hash,
            email,
            role_id: role.role_id
        });

        // Create customer profile if role is customer
        if (role_name === 'customer') {
            await Customer.create({
                user_id: user.user_id,
                email: email,
                first_name: req.body.first_name || '',
                last_name: req.body.last_name || '',
                phone: req.body.phone || ''
            });
        }

        res.status(201).json({
            success: true,
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
                role: role_name
            }
        });
    } catch (err) {
        console.error('User creation error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Logout route
router.post('/auth/logout', (req, res) => {
    // Clear the token or session
    res.clearCookie('token'); // Assuming token is stored in a cookie
    res.json({ success: true, message: 'Logged out successfully' });
});

// Apply authentication middleware for all routes below this point
router.use(authMiddleware);

// Add user listing endpoint - after authMiddleware
router.get('/users', requirePermission(['manage_users']), async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{ model: Role, as: 'role' }],
            attributes: { exclude: ['password_hash'] }
        });
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Add role creation endpoint
router.post('/roles', requirePermission(['manage_system']), async (req, res) => {
    try {
        const { role_name } = req.body;

        // Check if role already exists
        const existingRole = await Role.findOne({ where: { role_name } });
        if (existingRole) {
            return res.status(400).json({ error: 'Role already exists' });
        }

        // Create new role
        const role = await Role.create({ role_name });

        res.status(201).json({
            success: true,
            role: {
                id: role.role_id,
                name: role.role_name
            }
        });
    } catch (err) {
        console.error('Role creation error:', err);
        res.status(500).json({ error: 'Failed to create role' });
    }
});

// Add role listing endpoint
router.get('/roles', requirePermission(['manage_users']), async (req, res) => {
    try {
        const roles = await Role.findAll();
        res.json(roles);
    } catch (err) {
        console.error('Error fetching roles:', err);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

// Add audit log retrieval endpoint
router.get('/audit', requirePermission(['view_audit_logs']), async (req, res) => {
    try {
        const auditLogs = await AuditLog.findAll(); // Assuming AuditLog is a model
        res.json(auditLogs);
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// Store a card - allow customers, admins, and managers to add cards
// Fix the customer profile creation in the POST /cards endpoint
// POST /cards - Add a new card
router.post('/cards', async (req, res) => {
    try {
        // Log the request for debugging
        console.log('Card creation request received');
        console.log(`User role: ${req.user.role.role_name}`);

        // Handle both camelCase and snake_case field names
        const card_number = req.body.card_number || req.body.cardNumber;
        const cardholder_name = req.body.cardholder_name || req.body.cardholderName;
        const expiry_month = req.body.expiry_month || req.body.expiryMonth;
        const expiry_year = req.body.expiry_year || req.body.expiryYear;
        
        console.log('Parsed card data:', {
          card_number_length: card_number ? card_number.length : 0,
          cardholder_name,
          expiry_month,
          expiry_year
        });
        
        if (!card_number || !cardholder_name || !expiry_month || !expiry_year) {
          return res.status(400).json({ 
            error: 'Missing required card information'
          });
        }

        // Encrypt and mask the card number
        const encrypted = encrypt(card_number);
        const masked = card_number.replace(/\d(?=\d{4})/g, '*');
        
        // Generate a UUID for the card
        const cardId = uuidv4();
        
        // If user is customer, associate with their user ID directly
        if (req.user.role.role_name === 'customer') {
            // Insert directly using SQL to the customer_cards table
            await sequelize.query(
                `INSERT INTO customer_cards 
                 (card_id, user_id, card_number_encrypted, card_number_masked, 
                  expiry_month, expiry_year, cardholder_name, is_active, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
                { 
                    replacements: [
                        cardId,
                        req.user.user_id,
                        encrypted,
                        masked,
                        expiry_month,
                        expiry_year,
                        cardholder_name
                    ]
                }
            );
            
            console.log(`Added card ${cardId} for user ${req.user.user_id}`);
            
            return res.status(201).json({
                card_id: cardId,
                masked_number: masked,
                cardholder_name,
                expiry_month,
                expiry_year,
                message: 'Card added successfully'
            });
        } else if (req.user.role.role_name === 'financial_manager') {
            // For financial manager, also require a customer_id
            const customer_id = req.body.customer_id || req.body.customerId;
            
            if (!customer_id) {
                return res.status(400).json({ error: 'Customer ID is required' });
            }
            
            // Insert directly using SQL to the customer_cards table
            await sequelize.query(
                `INSERT INTO customer_cards 
                 (card_id, customer_id, card_number_encrypted, card_number_masked, 
                  expiry_month, expiry_year, cardholder_name, is_active, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
                { 
                    replacements: [
                        cardId,
                        customer_id,
                        encrypted,
                        masked,
                        expiry_month,
                        expiry_year,
                        cardholder_name
                    ]
                }
            );
            
            console.log(`Added card ${cardId} for customer ${customer_id} by financial manager`);
            
            return res.status(201).json({
                card_id: cardId,
                masked_number: masked,
                cardholder_name,
                expiry_month,
                expiry_year,
                message: 'Card added successfully'
            });
        } else {
            // For admin/manager, require a customer_id
            const customer_id = req.body.customer_id || req.body.customerId;
            
            if (!customer_id) {
                return res.status(400).json({ error: 'Customer ID is required' });
            }
            
            // Insert directly using SQL to the customer_cards table
            await sequelize.query(
                `INSERT INTO customer_cards 
                 (card_id, customer_id, card_number_encrypted, card_number_masked, 
                  expiry_month, expiry_year, cardholder_name, is_active, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
                { 
                    replacements: [
                        cardId,
                        customer_id,
                        encrypted,
                        masked,
                        expiry_month,
                        expiry_year,
                        cardholder_name
                    ]
                }
            );
            
            console.log(`Added card ${cardId} for customer ${customer_id}`);
            
            return res.status(201).json({
                card_id: cardId,
                masked_number: masked,
                cardholder_name,
                expiry_month,
                expiry_year,
                message: 'Card added successfully'
            });
        }
    } catch (err) {
        console.error('Error adding card:', err);
        res.status(500).json({ error: 'Failed to add card' });
    }
});

// GET /cards - Get all cards (masked)
router.get('/cards', async (req, res) => {
    try {
        console.log('Cards request received');
        console.log(`User role: ${req.user?.role?.role_name || 'Unknown'}`);
        
        let cards;
        
        if (req.user.role.role_name === 'customer') {
            // Customers can see cards associated with their user_id
            console.log(`Finding cards for user ${req.user.user_id}`);
            
            // Use the user_id instead of customer_id
            const [cards, metadata] = await sequelize.query(
                `SELECT * FROM customer_cards WHERE user_id = ?`,
                { replacements: [req.user.user_id] }
            );
            
            console.log(`Found ${cards.length} cards for user ${req.user.user_id}`);
            
            return res.json(cards.map(card => ({
                card_id: card.card_id,
                masked_number: card.card_number_masked,
                cardholder_name: card.cardholder_name,
                expiry_month: card.expiry_month,
                expiry_year: card.expiry_year
            })));
        } else if (['admin', 'manager', 'financial_manager'].includes(req.user.role.role_name)) {
            // Admins, managers, and financial managers can see all cards
            const [cards, metadata] = await sequelize.query(
                `SELECT * FROM customer_cards`
            );
            
            return res.json(cards.map(card => ({
                card_id: card.card_id,
                masked_number: card.card_number_masked,
                cardholder_name: card.cardholder_name,
                expiry_month: card.expiry_month,
                expiry_year: card.expiry_year,
                customer_id: card.customer_id,
                user_id: card.user_id
            })));
        } else {
            // Other roles need specific permissions
            const permissions = await Permission.findAll({
                include: [{
                    model: Role,
                    where: { role_id: req.user.role.role_id }
                }]
            });
            
            const userPermissions = permissions.map(p => p.permission_name);
            
            if (!userPermissions.includes('view_cards') && !userPermissions.includes('view_masked_card_data')) {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            const [cards, metadata] = await sequelize.query(
                `SELECT * FROM customer_cards`
            );
            
            return res.json(cards.map(card => ({
                card_id: card.card_id,
                masked_number: card.card_number_masked,
                cardholder_name: card.cardholder_name,
                expiry_month: card.expiry_month,
                expiry_year: card.expiry_year
            })));
        }
    } catch (err) {
        console.error('Error fetching cards:', err);
        res.status(500).json({ error: 'Failed to fetch cards' });
    }
});

// Delete card - requires delete_payment_methods permission or customer role
router.delete('/cards/:cardId', async (req, res) => {
    try {
        // First, check if the card exists
        const [cards, metadata] = await sequelize.query(
            `SELECT * FROM customer_cards WHERE card_id = ?`,
            { replacements: [req.params.cardId] }
        );
        
        if (cards.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }
        
        const card = cards[0];
        
        // If user is customer, they can only delete their own cards
        if (req.user.role.role_name === 'customer') {
            // Check if the card belongs to this user
            if (card.user_id !== req.user.user_id) {
                return res.status(403).json({ error: 'You can only delete your own cards' });
            }
            
            // Delete the card
            await sequelize.query(
                `DELETE FROM customer_cards WHERE card_id = ? AND user_id = ?`,
                { replacements: [req.params.cardId, req.user.user_id] }
            );
        } else if (req.user.role.role_name === 'admin' || req.user.role.role_name === 'manager') {
            // Admins and managers can delete any card without permission check
            await sequelize.query(
                `DELETE FROM customer_cards WHERE card_id = ?`,
                { replacements: [req.params.cardId] }
            );
        } else if (req.user.role.role_name === 'financial_manager') {
            // Financial managers cannot delete cards
            return res.status(403).json({ error: 'Financial managers are not authorized to delete cards' });
        } else {
            // Other roles need specific permissions
            const permissions = await Permission.findAll({
                include: [{
                    model: Role,
                    where: { role_id: req.user.role.role_id }
                }]
            });
            
            const userPermissions = permissions.map(p => p.permission_name);
            
            if (!userPermissions.includes('delete_payment_methods')) {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            // Delete the card
            await sequelize.query(
                `DELETE FROM customer_cards WHERE card_id = ?`,
                { replacements: [req.params.cardId] }
            );
        }
        
        res.json({ message: 'Card deleted successfully' });
    } catch (err) {
        console.error('Error deleting card:', err);
        res.status(500).json({ error: 'Failed to delete card' });
    }
});

// Global error handler for the API
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

module.exports = router;

// Create customer profile
router.post('/customers', async (req, res) => {
    try {
        console.log('Customer profile creation request received');
        console.log(`User ID: ${req.user.user_id}`);
        
        // Check if customer profile already exists
        const existingCustomer = await Customer.findOne({
            where: { user_id: req.user.user_id }
        });
        
        if (existingCustomer) {
            console.log(`Customer profile already exists for user ${req.user.user_id}`);
            return res.status(400).json({ error: 'Customer profile already exists' });
        }
        
        // Create new customer profile
        const newCustomer = await Customer.create({
            user_id: req.user.user_id,
            first_name: req.body.first_name || 'Customer',
            last_name: req.body.last_name || 'User',
            email: req.body.email || `user${req.user.user_id}@example.com`,
            phone: req.body.phone || '000-000-0000'
        });
        
        console.log(`Created customer profile with ID: ${newCustomer.customer_id}`);
        
        res.status(201).json({
            customer_id: newCustomer.customer_id,
            first_name: newCustomer.first_name,
            last_name: newCustomer.last_name,
            message: 'Customer profile created successfully'
        });
    } catch (err) {
        console.error('Error creating customer profile:', err);
        res.status(500).json({ error: 'Failed to create customer profile' });
    }
});

// At the top of your api.js file, add this import:
const { v4: uuidv4 } = require('uuid');
