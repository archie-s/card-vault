'use strict';

const { Customer, User } = require('../models');
const { encrypt } = require('../utils/encryption');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Find all customers - fix the association alias
      const customers = await Customer.findAll({
        include: [{ model: User }] // Remove the 'as: user' part
      });
      
      console.log(`Found ${customers.length} customers to seed cards for`);
      
      // Sample card data to distribute to customers
      const sampleCards = [
        {
          card_number: '4111111111111111',
          cardholder_name: 'John Doe',
          expiry_month: '12',
          expiry_year: '2025'
        },
        {
          card_number: '5555555555554444',
          cardholder_name: 'Jane Smith',
          expiry_month: '10',
          expiry_year: '2024'
        },
        {
          card_number: '378282246310005',
          cardholder_name: 'Robert Johnson',
          expiry_month: '08',
          expiry_year: '2026'
        }
      ];
      
      // Add cards for each customer
      for (const customer of customers) {
        // Use customer.User instead of customer.user
        console.log(`Adding cards for customer: ${customer.User?.username || customer.customer_id}`);
        
        // Add 2 random cards for each customer
        for (let i = 0; i < 2; i++) {
          const cardData = sampleCards[Math.floor(Math.random() * sampleCards.length)];
          
          // Encrypt and mask the card number
          const encrypted = encrypt(cardData.card_number);
          const masked = cardData.card_number.replace(/\d(?=\d{4})/g, '*');
          
          // Generate a UUID for the card
          const cardId = uuidv4();
          
          // Insert directly using SQL to the customer_cards table
          await sequelize.query(
            `INSERT INTO customer_cards 
             (card_id, customer_id, card_number_encrypted, card_number_masked, 
              expiry_month, expiry_year, cardholder_name, is_active, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
            { 
              replacements: [
                cardId,
                customer.customer_id,
                encrypted,
                masked,
                cardData.expiry_month,
                cardData.expiry_year,
                cardData.cardholder_name
              ]
            }
          );
          
          console.log(`Added card ${cardId} for customer ${customer.customer_id}`);
        }
      }
      
      console.log('Card seeding completed successfully');
      return true;
    } catch (error) {
      console.error('Error seeding cards:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all seeded cards
    return queryInterface.bulkDelete('customer_cards', null, {});
  }
};