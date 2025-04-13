'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, modify the foreign key constraint on customers table to SET NULL on delete
    await queryInterface.sequelize.query(`
      ALTER TABLE customers 
      DROP FOREIGN KEY customers_ibfk_1;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE customers
      ADD CONSTRAINT customers_ibfk_1
      FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    `);
    
    // Do the same for customer_cards table if it references users
    await queryInterface.sequelize.query(`
      ALTER TABLE customer_cards
      DROP FOREIGN KEY IF EXISTS customer_cards_ibfk_2;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE customer_cards
      ADD CONSTRAINT customer_cards_ibfk_2
      FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    `);
    
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the changes if needed
    await queryInterface.sequelize.query(`
      ALTER TABLE customers 
      DROP FOREIGN KEY customers_ibfk_1;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE customers
      ADD CONSTRAINT customers_ibfk_1
      FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE NO ACTION
      ON UPDATE CASCADE;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE customer_cards
      DROP FOREIGN KEY IF EXISTS customer_cards_ibfk_2;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE customer_cards
      ADD CONSTRAINT customer_cards_ibfk_2
      FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE NO ACTION
      ON UPDATE CASCADE;
    `);
    
    return Promise.resolve();
  }
};