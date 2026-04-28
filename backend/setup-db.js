const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  // Check if .env exists
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Please copy .env.example to .env and configure your database settings.');
    process.exit(1);
  }

  // Load environment variables
  require('dotenv').config();

  console.log('🔄 Setting up VINEYARD-SMS Database...');
  console.log(`📊 Database: ${process.env.DB_NAME}`);
  console.log(`👤 User: ${process.env.DB_USER}`);
  console.log('');

  let adminPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres', // Connect to default db first
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log('🔄 Step 1: Creating database...');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'shule_sms';
    
    // Check if database exists
    const dbCheck = await adminPool.query(
      `SELECT datname FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created`);
    } else {
      console.log(`ℹ️  Database '${dbName}' already exists`);
    }

  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    process.exit(1);
  } finally {
    await adminPool.end();
  }

  // Connect to the specific database
  const dbPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log('🔄 Step 2: Creating database schema...');

    // Read and execute the migration file
    const migrationPath = path.join(__dirname, 'migrations/database.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await dbPool.query(statement);
        } catch (error) {
          // Ignore errors if tables already exist
          if (!error.message.includes('already exists')) {
            console.warn('⚠️  Warning:', error.message.split('\n')[0]);
          }
        }
      }
    }

    console.log('✅ Database schema created/verified');

    // Check if any users exist
    console.log('🔄 Step 3: Checking for existing users...');
    const userCheck = await dbPool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCheck.rows[0].count);

    if (userCount === 0) {
      console.log('🔄 Step 4: Creating test admin user...');

      // Create a test school
      const schoolResult = await dbPool.query(
        `INSERT INTO schools (name, registration_number, email, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['Vineyard Test School', 'TEST001', 'admin@vineyard.test', '+254700000000']
      );

      const schoolId = schoolResult.rows[0].id;
      console.log(`✅ Test school created: ${schoolId}`);

      // Hash the test password
      const testPassword = 'admin123456';
      const hashedPassword = await bcrypt.hash(testPassword, 10);

      // Create admin user
      const adminResult = await dbPool.query(
        `INSERT INTO users (school_id, email, password_hash, role, first_name, last_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email`,
        [schoolId, 'admin@vineyard.test', hashedPassword, 'super_admin', 'Admin', 'User', true]
      );

      const admin = adminResult.rows[0];
      console.log(`✅ Test admin user created`);
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('📋 TEST CREDENTIALS:');
      console.log('═══════════════════════════════════════════════════');
      console.log(`Email:    ${admin.email}`);
      console.log(`Password: ${testPassword}`);
      console.log('═══════════════════════════════════════════════════');
      console.log('');

    } else {
      console.log(`ℹ️  Database has ${userCount} user(s). Skipping admin creation.`);
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('You can now start the server with: npm run dev');
    console.log('');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase().catch(error => {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  });
}

module.exports = setupDatabase;