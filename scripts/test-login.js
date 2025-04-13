'use strict';

const bcrypt = require('bcrypt');
const { User, Role, sequelize } = require('../models');

async function testLogin() {
  try {
    console.log('Testing database connection...');
    
    // Test database connection
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');
      
      // Get database name
      const dbName = sequelize.config.database;
      console.log(`Connected to database: ${dbName}`);
    } catch (err) {
      console.error('Unable to connect to the database:', err);
      return;
    }
    
    // Check if users table exists and has records
    try {
      const userCount = await User.count();
      console.log(`Total users in database: ${userCount}`);
      
      // List all users
      const allUsers = await User.findAll({ attributes: ['username', 'email'] });
      console.log('All users:', allUsers.map(u => u.username));
    } catch (err) {
      console.error('Error checking users table:', err);
    }
    
    // Check if roles table exists and has records
    try {
      const roleCount = await Role.count();
      console.log(`Total roles in database: ${roleCount}`);
      
      // List all roles
      const allRoles = await Role.findAll();
      console.log('All roles:', allRoles.map(r => r.role_name));
    } catch (err) {
      console.error('Error checking roles table:', err);
    }
    
    const username = 'adminuser';
    const password = 'AdminPassword123!';
    
    console.log(`\nTesting login for user: ${username}`);
    
    // Find user by username
    const user = await User.findOne({
      where: { username },
      include: [{ model: Role, as: 'role' }]
    });
    
    if (!user) {
      console.error('User not found');
      return;
    }
    
    console.log('User found:', {
      id: user.user_id,
      username: user.username,
      role: user.role ? user.role.role_name : 'No role found'
    });
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (validPassword) {
      console.log('Password is valid. Login would succeed.');
    } else {
      console.log('Password is invalid. Login would fail.');
      console.log('Stored password hash:', user.password_hash);
      
      // Create a new hash for comparison
      const newHash = await bcrypt.hash(password, 10);
      console.log('New hash of the same password:', newHash);
    }
  } catch (error) {
    console.error('Error testing login:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

testLogin();