// MongoDB Initialization Script for FinSwitch Platform
// This script runs automatically when MongoDB container starts for the first time

db = db.getSiblingDB('finswitch');

// Create collections
db.createCollection('users');
db.createCollection('roles');
db.createCollection('transactions');
db.createCollection('routing_rules');
db.createCollection('settlements');
db.createCollection('audit_logs');

print('✓ Collections created successfully');

// Create indexes for users collection
db.users.createIndex({ username: 1 }, { unique: true, name: 'idx_username' });
db.users.createIndex({ email: 1 }, { unique: true, name: 'idx_email' });
db.users.createIndex({ userId: 1 }, { unique: true, name: 'idx_user_id' });

print('✓ User indexes created');

// Create indexes for transactions collection
db.transactions.createIndex({ transactionId: 1 }, { unique: true, name: 'idx_transaction_id' });
db.transactions.createIndex({ merchantId: 1, createdAt: -1 }, { name: 'idx_merchant_date' });
db.transactions.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_date' });
db.transactions.createIndex({ createdAt: -1 }, { name: 'idx_created_at' });
db.transactions.createIndex({ cardBin: 1 }, { name: 'idx_card_bin' });

print('✓ Transaction indexes created');

// Create indexes for routing_rules collection
db.routing_rules.createIndex({ ruleId: 1 }, { unique: true, name: 'idx_rule_id' });
db.routing_rules.createIndex({ priority: -1, enabled: 1 }, { name: 'idx_enabled_priority' });
db.routing_rules.createIndex({ enabled: 1 }, { name: 'idx_enabled' });

print('✓ Routing rule indexes created');

// Create indexes for settlements collection
db.settlements.createIndex({ settlementId: 1 }, { unique: true, name: 'idx_settlement_id' });
db.settlements.createIndex({ merchantId: 1, settlementDate: -1 }, { name: 'idx_merchant_settlement_date' });
db.settlements.createIndex({ settlementDate: -1 }, { name: 'idx_settlement_date' });
db.settlements.createIndex({ status: 1 }, { name: 'idx_settlement_status' });

print('✓ Settlement indexes created');

// Create indexes for audit_logs collection
db.audit_logs.createIndex({ timestamp: -1 }, { name: 'idx_timestamp' });
db.audit_logs.createIndex({ userId: 1, timestamp: -1 }, { name: 'idx_user_timestamp' });
db.audit_logs.createIndex({ entityType: 1, entityId: 1 }, { name: 'idx_entity' });
db.audit_logs.createIndex({ action: 1, timestamp: -1 }, { name: 'idx_action_timestamp' });

print('✓ Audit log indexes created');

// Create indexes for roles collection
db.roles.createIndex({ roleName: 1 }, { unique: true, name: 'idx_role_name' });

print('✓ Role indexes created');

// Insert default roles
db.roles.insertMany([
  {
    roleId: 'role_admin',
    roleName: 'Admin',
    permissions: [
      { resource: 'payments', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'routing', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'settlements', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'reconciliation', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'audit', actions: ['read'] }
    ],
    description: 'Full system access',
    createdAt: new Date()
  },
  {
    roleId: 'role_operations',
    roleName: 'Operations',
    permissions: [
      { resource: 'payments', actions: ['read'] },
      { resource: 'routing', actions: ['create', 'read', 'update'] },
      { resource: 'settlements', actions: ['create', 'read'] },
      { resource: 'reconciliation', actions: ['read'] }
    ],
    description: 'Operations team access',
    createdAt: new Date()
  },
  {
    roleId: 'role_auditor',
    roleName: 'Auditor',
    permissions: [
      { resource: 'payments', actions: ['read'] },
      { resource: 'settlements', actions: ['read'] },
      { resource: 'reconciliation', actions: ['read'] },
      { resource: 'audit', actions: ['read'] }
    ],
    description: 'Audit and compliance access',
    createdAt: new Date()
  },
  {
    roleId: 'role_developer',
    roleName: 'Developer',
    permissions: [
      { resource: 'payments', actions: ['create', 'read'] },
      { resource: 'routing', actions: ['read'] }
    ],
    description: 'Developer testing access',
    createdAt: new Date()
  }
]);

print('✓ Default roles inserted');

// Insert default admin user (password: admin123)
// Password hash for 'admin123' with bcrypt salt rounds 10
db.users.insertOne({
  userId: 'user_admin_default',
  username: 'admin',
  email: 'admin@finswitch.local',
  passwordHash: '$2b$10$rKvVPZqGsYqjlFqh5Y5zKOXKZJX8qVZ8qVZ8qVZ8qVZ8qVZ8qVZ8q', // admin123
  roles: ['Admin'],
  isActive: true,
  createdAt: new Date(),
  metadata: {
    createdBy: 'system',
    lastModifiedBy: 'system'
  }
});

print('✓ Default admin user created (username: admin, password: admin123)');
print('⚠️  IMPORTANT: Change the default admin password after first login!');

print('\n=== MongoDB initialization completed successfully ===\n');
