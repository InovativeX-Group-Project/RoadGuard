const { query } = require('./config/db');
const fs = require('fs');
const path = require('path');

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database schema...');
    
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role VARCHAR(50) DEFAULT 'citizen',
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create reports table
    await query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image TEXT,
        issue_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Reports table created');

    // Migrate existing deployments that still have VARCHAR image columns.
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'reports' AND column_name = 'image'
        ) THEN
          EXECUTE 'ALTER TABLE reports ALTER COLUMN image TYPE TEXT';
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'reports' AND column_name = 'image_url'
        ) THEN
          EXECUTE 'ALTER TABLE reports ALTER COLUMN image_url TYPE TEXT';
        END IF;
      END
      $$;
    `);
    console.log('✅ Reports image column migration checked');

    // Create report history table
    await query(`
      CREATE TABLE IF NOT EXISTS report_history (
        id UUID PRIMARY KEY,
        report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255) NOT NULL
      )
    `);
    console.log('✅ Report history table created');

    // Create comments table
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY,
        report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        author VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Comments table created');

    // Create indexes
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)',
      'CREATE INDEX IF NOT EXISTS idx_report_history_report_id ON report_history(report_id)',
      'CREATE INDEX IF NOT EXISTS idx_comments_report_id ON comments(report_id)'
    ];
    
    for (const indexQuery of indexQueries) {
      await query(indexQuery);
    }
    console.log('✅ Indexes created');

    // Seed admin user if it doesn't exist
    const adminEmail = 'staff@roadguard.gov.za';
    const result = await query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (result.rowCount === 0) {
      // This is a pre-hashed password from the JSON file
      const hashedPassword = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
      
      await query(
        `INSERT INTO users (id, name, email, role, password_hash)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
        ['Council Staff', adminEmail, 'admin', hashedPassword]
      );
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    console.log('✅ Database initialization complete!');
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.error('❌ Database initialization error:', error.message);
    }
  }
};

module.exports = { initDatabase };

