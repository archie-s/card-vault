'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First check if roles already exist to avoid duplicates
      const existingRoles = await queryInterface.sequelize.query(
        'SELECT role_name FROM roles',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (existingRoles.length === 0) {
        // Create roles
        const roles = [
          { role_id: 1, role_name: 'admin', description: 'System administrator', created_at: new Date(), updated_at: new Date() },
          { role_id: 2, role_name: 'manager', description: 'Business manager', created_at: new Date(), updated_at: new Date() },
          { role_id: 3, role_name: 'clerk', description: 'Customer service clerk', created_at: new Date(), updated_at: new Date() },
          { role_id: 4, role_name: 'customer', description: 'End customer', created_at: new Date(), updated_at: new Date() },
          { role_id: 5, role_name: 'financial_manager', description: 'Financial operations manager', created_at: new Date(), updated_at: new Date() }
        ];

        await queryInterface.bulkInsert('roles', roles, {});
      }

      // Check if permissions already exist
      const existingPermissions = await queryInterface.sequelize.query(
        'SELECT permission_name FROM permissions',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (existingPermissions.length === 0) {
        // Create permissions
        const permissions = [
          { permission_id: 1, permission_name: 'view_users', description: 'View user accounts', created_at: new Date(), updated_at: new Date() },
          { permission_id: 2, permission_name: 'manage_users', description: 'Create, update, delete users', created_at: new Date(), updated_at: new Date() },
          { permission_id: 3, permission_name: 'view_cards', description: 'View masked card data', created_at: new Date(), updated_at: new Date() },
          { permission_id: 4, permission_name: 'manage_cards', description: 'Add and update cards', created_at: new Date(), updated_at: new Date() },
          { permission_id: 5, permission_name: 'delete_payment_methods', description: 'Delete payment methods', created_at: new Date(), updated_at: new Date() },
          { permission_id: 6, permission_name: 'view_sensitive_card_data', description: 'View full card numbers', created_at: new Date(), updated_at: new Date() },
          { permission_id: 7, permission_name: 'view_audit_logs', description: 'View system audit logs', created_at: new Date(), updated_at: new Date() },
          { permission_id: 8, permission_name: 'manage_system', description: 'Configure system settings', created_at: new Date(), updated_at: new Date() },
          { permission_id: 9, permission_name: 'process_payments', description: 'Process payment transactions', created_at: new Date(), updated_at: new Date() },
          { permission_id: 10, permission_name: 'view_financial_reports', description: 'View financial reports', created_at: new Date(), updated_at: new Date() },
          { permission_id: 11, permission_name: 'view_own_cards', description: 'View own masked card data', created_at: new Date(), updated_at: new Date() },
          { permission_id: 12, permission_name: 'manage_own_cards', description: 'Add and update own cards', created_at: new Date(), updated_at: new Date() }
        ];

        await queryInterface.bulkInsert('permissions', permissions, {});
      }

      // Define permissions for each role
      const rolePermissions = {
        'admin': [1, 2, 3, 4, 5, 6, 7, 8, 9],
        'manager': [1, 3, 4, 5, 7, 9],
        'clerk': [3, 4, 9],
        'customer': [11, 12],
        'financial_manager': [1, 3, 4, 7, 9, 10]  // Added view_cards and manage_cards permissions
      };

      // Check if role_permissions already exist
      const existingRolePermissions = await queryInterface.sequelize.query(
        'SELECT role_id, permission_id FROM role_permissions',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (existingRolePermissions.length === 0) {
        // Get role IDs from the database
        const dbRoles = await queryInterface.sequelize.query(
          'SELECT role_id, role_name FROM roles',
          { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        
        // Create role_permissions
        const rolePermissionsData = [];
        for (const [roleName, permissionIds] of Object.entries(rolePermissions)) {
          const role = dbRoles.find(r => r.role_name === roleName);
          if (role) {
            for (const permissionId of permissionIds) {
              rolePermissionsData.push({
                role_id: role.role_id,
                permission_id: permissionId,
                created_at: new Date(),
                updated_at: new Date()
              });
            }
          }
        }

        if (rolePermissionsData.length > 0) {
          await queryInterface.bulkInsert('role_permissions', rolePermissionsData, {});
        }
      }

      // Only create default users if none exist
      const existingUsers = await queryInterface.sequelize.query(
        'SELECT username FROM users',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (existingUsers.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const users = [
          {
            user_id: 1,
            username: 'admin',
            email: 'admin@example.com',
            password_hash: await bcrypt.hash('admin123', salt),
            role_id: 1,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            user_id: 2,
            username: 'manager',
            email: 'manager@example.com',
            password_hash: await bcrypt.hash('manager123', salt),
            role_id: 2,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            user_id: 3,
            username: 'clerk',
            email: 'clerk@example.com',
            password_hash: await bcrypt.hash('clerk123', salt),
            role_id: 3,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            user_id: 4,
            username: 'customer',
            email: 'customer@example.com',
            password_hash: await bcrypt.hash('customer123', salt),
            role_id: 4,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            user_id: 5,
            username: 'financial',
            email: 'financial@example.com',
            password_hash: await bcrypt.hash('financial123', salt),
            role_id: 5,
            created_at: new Date(),
            updated_at: new Date()
          }
        ];

        await queryInterface.bulkInsert('users', users, {});
      }

      return Promise.resolve();
    } catch (error) {
      console.error('Error in default-users seeder:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // First, remove role_permissions
      await queryInterface.bulkDelete('role_permissions', null, {});
      
      // Then remove permissions
      await queryInterface.bulkDelete('permissions', null, {});
      
      // Now we can delete users
      await queryInterface.bulkDelete('users', null, {});
      
      // Finally delete roles
      await queryInterface.bulkDelete('roles', null, {});
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error in default-users down method:', error);
      return Promise.reject(error);
    }
  }
};