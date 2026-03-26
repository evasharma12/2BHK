require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

// Use env vars so the same script works for local and production (e.g. Render + PlanetScale)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '2bhk_db',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
};

// Create database schema
async function createDatabaseSchema() {
  let connection;
  
  try {
    // Connect to MySQL server (without selecting a database) first.
    // This avoids failures when the target DB doesn't exist yet.
    const targetDb = dbConfig.database;
    const serverConfig = { ...dbConfig, database: undefined };

    connection = await mysql.createConnection(serverConfig);
    console.log('Connected to MySQL server');

    if (targetDb) {
      await connection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✓ Ensured database exists: ${targetDb}`);
    }

    await connection.end();

    // Re-connect with the target database selected, then create tables.
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL database');

    // ============================================
    // 1. USERS TABLE
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        user_type ENUM('owner', 'renter', 'buyer', 'both') NOT NULL DEFAULT 'renter',
        full_name VARCHAR(255),
        profile_image VARCHAR(500),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
      )
    `);
    console.log('✓ Created users table');

    // ============================================
    // 2. USER_PHONES TABLE (for multiple phone numbers)
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_phones (
        phone_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY unique_phone (user_id, phone_number)
      )
    `);
    console.log('✓ Created user_phones table');

    // ============================================
    // DESTRUCTIVE RESET FOR PROPERTY STACK (cutover)
    // ============================================
    // Drop dependent tables first so properties can be recreated safely.
    await connection.execute('DROP TABLE IF EXISTS chat_messages');
    await connection.execute('DROP TABLE IF EXISTS chat_threads');
    await connection.execute('DROP TABLE IF EXISTS property_images');
    await connection.execute('DROP TABLE IF EXISTS property_amenities');
    await connection.execute('DROP TABLE IF EXISTS saved_properties');
    await connection.execute('DROP TABLE IF EXISTS properties');
    console.log('✓ Reset property tables for spatial cutover');

    // ============================================
    // 3. PROPERTIES TABLE (Main table - optimized for filtering)
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS properties (
        property_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        
        -- Basic Info
        property_for ENUM('rent', 'sell') NOT NULL,
        property_type ENUM('apartment', 'independent-house', 'villa', 'builder-floor', 'studio', 'penthouse') NOT NULL,
        bhk_type VARCHAR(10) NOT NULL, -- '1', '2', '3', '4+', etc.
        
        -- Location
        address_text TEXT NULL,
        locality VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        pincode VARCHAR(10) NOT NULL,
        location POINT NOT NULL SRID 4326,
        
        -- Property Details
        built_up_area INT NOT NULL, -- in sq ft
        carpet_area INT NOT NULL,
        total_floors INT NOT NULL,
        floor_number INT NOT NULL,
        bedrooms INT,
        bathrooms INT,
        balconies INT DEFAULT 0,
        property_age ENUM('0-1', '1-3', '3-5', '5-10', '10+') NOT NULL,
        furnishing ENUM('fully-furnished', 'semi-furnished', 'unfurnished') NOT NULL,
        facing ENUM('north', 'south', 'east', 'west', 'north-east', 'north-west', 'south-east', 'south-west'),
        
        -- Pricing
        expected_price DECIMAL(12, 2) NOT NULL,
        price_negotiable BOOLEAN DEFAULT FALSE,
        maintenance_charges DECIMAL(10, 2), -- for rent
        security_deposit DECIMAL(12, 2), -- for rent
        
        -- Description
        description TEXT,
        
        -- Availability
        available_from DATE,
        
        -- Status
        status ENUM('active', 'inactive', 'rented', 'sold', 'pending') DEFAULT 'active',
        is_verified BOOLEAN DEFAULT FALSE,
        
        -- Metadata
        views_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE,
        
        -- CRITICAL INDEXES FOR FILTERING (Performance optimization)
        INDEX idx_property_for (property_for),
        INDEX idx_bhk_type (bhk_type),
        INDEX idx_property_type (property_type),
        INDEX idx_price (expected_price),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_furnishing (furnishing),
        SPATIAL INDEX idx_location (location),
        
        -- COMPOSITE INDEXES for common filter combinations
        INDEX idx_for_city_locality_bhk (property_for, city, locality, bhk_type),
        INDEX idx_for_price (property_for, expected_price)
      )
    `);
    console.log('✓ Created properties table with optimized indexes');

    // ============================================
    // 4. PROPERTY_IMAGES TABLE
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS property_images (
        image_id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        image_order INT DEFAULT 0, -- for ordering images (cover image = 0)
        is_cover BOOLEAN DEFAULT FALSE,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created property_images table');

    // ============================================
    // 5. AMENITIES TABLE (Master list)
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS amenities (
        amenity_id INT AUTO_INCREMENT PRIMARY KEY,
        amenity_name VARCHAR(100) NOT NULL UNIQUE,
        amenity_slug VARCHAR(100),
        icon VARCHAR(50), -- emoji or icon class
        category VARCHAR(50) -- 'safety', 'leisure', 'convenience', etc.
      )
    `);
    console.log('✓ Created amenities table');

    // ============================================
    // 6. PROPERTY_AMENITIES TABLE (Junction table)
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS property_amenities (
        property_id INT NOT NULL,
        amenity_id INT NOT NULL,
        
        PRIMARY KEY (property_id, amenity_id),
        FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
        FOREIGN KEY (amenity_id) REFERENCES amenities(amenity_id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created property_amenities table');

    // ============================================
    // 7. SAVED_PROPERTIES TABLE (User favorites)
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS saved_properties (
        saved_property_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        property_id INT NOT NULL,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT, -- user's private notes
        
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
        UNIQUE KEY unique_save (user_id, property_id)
      )
    `);
    console.log('✓ Created saved_properties table');

    // ============================================
    // 8. CHAT_THREADS TABLE
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_threads (
        thread_id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT NOT NULL,
        owner_user_id INT NOT NULL,
        participant_user_id INT NOT NULL,
        last_message_at TIMESTAMP NULL,
        last_message_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
        FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (participant_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY unique_property_owner_participant (property_id, owner_user_id, participant_user_id)
      )
    `);
    console.log('✓ Created chat_threads table');

    // ============================================
    // 9. CHAT_MESSAGES TABLE
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        message_id INT AUTO_INCREMENT PRIMARY KEY,
        thread_id INT NOT NULL,
        sender_user_id INT NOT NULL,
        message_text TEXT NOT NULL,
        message_type ENUM('text') NOT NULL DEFAULT 'text',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (thread_id) REFERENCES chat_threads(thread_id) ON DELETE CASCADE,
        FOREIGN KEY (sender_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_thread_created_at (thread_id, created_at),
        INDEX idx_thread_is_read (thread_id, is_read)
      )
    `);
    console.log('✓ Created chat_messages table');

    // ============================================
    // 10. INQUIRIES TABLE (Contact requests)
    // ============================================
    // await connection.execute(`
    //   CREATE TABLE IF NOT EXISTS inquiries (
    //     inquiry_id INT AUTO_INCREMENT PRIMARY KEY,
    //     property_id INT NOT NULL,
    //     inquirer_user_id INT, -- NULL if not logged in
    //     inquirer_name VARCHAR(255) NOT NULL,
    //     inquirer_email VARCHAR(255) NOT NULL,
    //     inquirer_phone VARCHAR(20) NOT NULL,
    //     message TEXT,
    //     status ENUM('new', 'contacted', 'interested', 'not-interested', 'closed') DEFAULT 'new',
    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
    //     FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
    //     FOREIGN KEY (inquirer_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    //     INDEX idx_property_id (property_id),
    //     INDEX idx_inquirer_user_id (inquirer_user_id),
    //     INDEX idx_status (status),
    //     INDEX idx_created_at (created_at)
    //   );
    // `);
    // console.log('✓ Created inquiries table');

    // ============================================
    // 11. INSERT DEFAULT AMENITIES
    // ============================================
    // await connection.execute(`
    //   INSERT IGNORE INTO amenities (amenity_name, amenity_slug, icon, category) VALUES
    //     ('Car Parking', 'parking', '🚗', 'convenience'),
    //     ('Gym', 'gym', '💪', 'leisure'),
    //     ('Swimming Pool', 'swimming-pool', '🏊', 'leisure'),
    //     ('Garden', 'garden', '🌳', 'leisure'),
    //     ('Clubhouse', 'clubhouse', '🏛️', 'leisure'),
    //     ('Kids Play Area', 'kids-play-area', '🎪', 'leisure'),
    //     ('Lift/Elevator', 'lift', '🛗', 'convenience'),
    //     ('Power Backup', 'power-backup', '⚡', 'convenience'),
    //     ('24/7 Security', 'security', '🛡️', 'safety'),
    //     ('CCTV Surveillance', 'cctv', '📹', 'safety'),
    //     ('24/7 Water Supply', 'water-supply', '💧', 'convenience'),
    //     ('Internet/WiFi', 'internet', '📶', 'convenience'),
    //     ('Intercom', 'intercom', '📞', 'convenience'),
    //     ('Maintenance Staff', 'maintenance-staff', '👷', 'convenience'),
    //     ('Visitor Parking', 'visitor-parking', '🅿️', 'convenience'),
    //     ('Fire Safety', 'fire-safety', '🧯', 'safety'),
    //     ('Rainwater Harvesting', 'rainwater-harvesting', '🌧️', 'eco'),
    //     ('Waste Disposal', 'waste-disposal', '🗑️', 'convenience'),
    //     ('Servant Room', 'servant-room', '🚪', 'rooms'),
    //     ('Study Room', 'study-room', '📚', 'rooms'),
    //     ('Store Room', 'store-room', '📦', 'rooms'),
    //     ('Balcony', 'balcony', '🪟', 'rooms'),
    //     ('Air Conditioning', 'ac', '❄️', 'comfort'),
    //     ('Modular Kitchen', 'modular-kitchen', '🍳', 'comfort')
    // `);
    // console.log('✓ Inserted default amenities');

    console.log('\n✅ Database schema created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating database schema:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the schema creation
createDatabaseSchema()
  .then(() => {
    console.log('\n🎉 All tables created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create schema:', error);
    process.exit(1);
  });

module.exports = { createDatabaseSchema };