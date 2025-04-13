'use strict';

const bcrypt = require('bcrypt');
const { User, Role, Customer, Card, sequelize } = require('../models');
const { encrypt } = require('../utils/encryption');

async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // Sync models with the database without dropping tables
    console.log('Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('Database models synced successfully');

    // Check if roles already exist
    const existingRoles = await Role.findAll();
    if (existingRoles.length === 0) {
      // Create roles
      const roles = [
        { role_name: 'admin' },
        { role_name: 'customer' },
        { role_name: 'support' },
        { role_name: 'manager' },
        { role_name: 'financial_analyst' }
      ];

      const createdRoles = {};
      for (const roleData of roles) {
        const role = await Role.create(roleData);
        createdRoles[roleData.role_name] = role;
        console.log(`Created role: ${roleData.role_name}`);
      }

      // Create users
      const users = [
        {
          username: 'adminuser',
          password: 'AdminPassword123!',
          email: 'admin@example.com',
          role_name: 'admin',
          first_name: 'Admin',
          last_name: 'User',
          phone: '1234567890'
        },
        {
          username: 'customeruser',
          password: 'CustomerPassword123!',
          email: 'customer@example.com',
          role_name: 'customer',
          first_name: 'Customer',
          last_name: 'User',
          phone: '0987654321'
        },
        {
          username: 'supportuser',
          password: 'SupportPassword123!',
          email: 'support@example.com',
          role_name: 'support',
          first_name: 'Support',
          last_name: 'User',
          phone: '1122334455'
        },
        {
          username: 'manageruser',
          password: 'ManagerPassword123!',
          email: 'manager@example.com',
          role_name: 'manager',
          first_name: 'Manager',
          last_name: 'User',
          phone: '2233445566'
        },
        {
          username: 'analystuser',
          password: 'AnalystPassword123!',
          email: 'analyst@example.com',
          role_name: 'financial_analyst',
          first_name: 'Analyst',
          last_name: 'User',
          phone: '3344556677'
        }
      ];

      const createdUsers = {};
      for (const userData of users) {
        // Check if user already exists
        const existingUser = await User.findOne({ where: { username: userData.username } });
        if (existingUser) {
          console.log(`User already exists: ${userData.username}`);
          createdUsers[userData.username] = existingUser;
          continue;
        }

        // Make sure we find the role
        const role = await Role.findOne({ where: { role_name: userData.role_name } });
        if (!role) {
          console.error(`Role not found: ${userData.role_name}`);
          continue;
        }
        
        // Hash password with 10 rounds of salting
        const password_hash = await bcrypt.hash(userData.password, 10);
        
        // Create user with explicit fields
        const user = await User.create({
          username: userData.username,
          password_hash: password_hash,
          email: userData.email,
          role_id: role.role_id
        });
        
        console.log(`Created user: ${userData.username} with role: ${userData.role_name} (role_id: ${role.role_id})`);
        createdUsers[userData.username] = user;

        // Create customer profile if role is customer
        if (userData.role_name === 'customer') {
          // Check if customer profile already exists
          const existingCustomer = await Customer.findOne({ where: { user_id: user.user_id } });
          if (!existingCustomer) {
            const customer = await Customer.create({
              user_id: user.user_id,
              email: userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              phone: userData.phone
            });
            console.log(`Created customer profile for: ${userData.username}`);
            
            // Create sample cards for this customer
            const cards = [
              {
                card_number: '4111111111111111',
                cardholder_name: `${userData.first_name} ${userData.last_name}`,
                expiry_month: '12',
                expiry_year: '2025'
              },
              {
                card_number: '5555555555554444',
                cardholder_name: `${userData.first_name} ${userData.last_name}`,
                expiry_month: '06',
                expiry_year: '2024'
              }
            ];
            
            for (const cardData of cards) {
              const encrypted = encrypt(cardData.card_number);
              const masked = cardData.card_number.replace(/\d(?=\d{4})/g, '*');
              
              await Card.create({
                customer_id: customer.customer_id,
                card_number_encrypted: encrypted,
                card_number_masked: masked,
                cardholder_name: cardData.cardholder_name,
                expiry_month: cardData.expiry_month,
                expiry_year: cardData.expiry_year
              });
              console.log(`Created card for: ${userData.username}`);
            }
          } else {
            console.log(`Customer profile already exists for: ${userData.username}`);
          }
        }
      }
    } else {
      console.log('Roles already exist in the database. Skipping seed data creation.');
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the seed function
seedDatabase();