require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const { getMysql2Ssl } = require('../config/mysqlSsl');

// Align with dbConnection.js (DB_* and Railway MYSQL* names)
const dbSsl = getMysql2Ssl();

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || '2bhk_db',
  port: (() => {
    const p = process.env.DB_PORT || process.env.MYSQLPORT;
    return p ? parseInt(p, 10) : 3306;
  })(),
  ...(dbSsl && { ssl: dbSsl }),
};

const MYSQL_RESERVED_DATABASES = new Set([
  'mysql',
  'information_schema',
  'performance_schema',
  'sys',
]);

function quoteIdentifier(name) {
  return '`' + String(name).replace(/`/g, '``') + '`';
}

function normalizeToE164India(phone) {
  const digits = String(phone || '').trim().replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return '';
}

/**
 * App schema name must not be a MySQL system database (common misconfiguration: DB_NAME=mysql).
 */
function assertApplicationDatabaseName(name) {
  const raw = String(name || '').trim();
  const effective = raw || '2bhk_db';
  if (MYSQL_RESERVED_DATABASES.has(effective.toLowerCase())) {
    throw new Error(
      `Invalid DB_NAME "${effective}": reserved MySQL system database name. ` +
        'Set DB_NAME to your application database (e.g. 2bhk_db) in App Runner / .env — not "mysql".'
    );
  }
  return effective;
}

async function runLegacyAdminPhantomBackfill(connection) {
  const shouldBackfill = String(process.env.PHANTOM_OWNER_BACKFILL_LEGACY || '').toLowerCase() === 'true';
  if (!shouldBackfill) {
    console.log('↷ Skipping legacy phantom-owner backfill (PHANTOM_OWNER_BACKFILL_LEGACY is not true)');
    return;
  }

  const dryRun = String(process.env.PHANTOM_OWNER_BACKFILL_DRY_RUN || '').toLowerCase() === 'true';
  const maxRowsRaw = parseInt(process.env.PHANTOM_OWNER_BACKFILL_LIMIT || '0', 10);
  const maxRows = Number.isInteger(maxRowsRaw) && maxRowsRaw > 0 ? maxRowsRaw : 0;

  const candidatesSql = `
    SELECT
      p.property_id,
      p.owner_id AS admin_user_id,
      p.secondary_phone_number
    FROM properties p
    INNER JOIN admin_users au
      ON au.user_id = p.owner_id
    WHERE p.owner_profile_id IS NULL
      AND p.ownership_mode = 'registered_owner'
      AND p.owner_id IS NOT NULL
      AND p.secondary_phone_number IS NOT NULL
      AND TRIM(p.secondary_phone_number) <> ''
      ${maxRows > 0 ? 'LIMIT ?' : ''}
  `;

  const [candidateRows] = maxRows > 0
    ? await connection.execute(candidatesSql, [maxRows])
    : await connection.execute(candidatesSql);

  if (!candidateRows.length) {
    console.log('✓ Legacy phantom-owner backfill found no eligible properties');
    return;
  }

  let updatedCount = 0;
  let skippedInvalidPhone = 0;
  let skippedNoAdmin = 0;

  for (const row of candidateRows) {
    const propertyId = row.property_id;
    const adminUserId = row.admin_user_id;
    const ownerPhoneE164 = normalizeToE164India(row.secondary_phone_number);

    if (!adminUserId) {
      skippedNoAdmin += 1;
      continue;
    }

    if (!ownerPhoneE164) {
      skippedInvalidPhone += 1;
      continue;
    }

    const [profileRows] = await connection.execute(
      `
      SELECT owner_profile_id
      FROM phantom_property_owner_profiles
      WHERE owner_phone_number = ?
      LIMIT 1
      `,
      [ownerPhoneE164]
    );

    let ownerProfileId = profileRows[0]?.owner_profile_id;
    if (!ownerProfileId) {
      const ownerLabelSuffix = ownerPhoneE164.slice(-4);
      const [insertResult] = await connection.execute(
        `
        INSERT INTO phantom_property_owner_profiles (
          owner_name,
          owner_phone_number,
          source,
          created_by_user_id
        )
        VALUES (?, ?, 'manual_admin', ?)
        `,
        [`Legacy Owner ${ownerLabelSuffix}`, ownerPhoneE164, adminUserId]
      );
      ownerProfileId = insertResult.insertId;
    }

    if (dryRun) {
      updatedCount += 1;
      continue;
    }

    const [updateResult] = await connection.execute(
      `
      UPDATE properties
      SET
        owner_profile_id = ?,
        ownership_mode = 'phantom_owner',
        chat_owner_user_id = COALESCE(chat_owner_user_id, ?),
        updated_at = CURRENT_TIMESTAMP
      WHERE property_id = ?
        AND owner_profile_id IS NULL
        AND ownership_mode = 'registered_owner'
      `,
      [ownerProfileId, adminUserId, propertyId]
    );

    if (updateResult.affectedRows > 0) {
      updatedCount += 1;
    }
  }

  if (dryRun) {
    console.log(
      `✓ Legacy phantom-owner backfill dry-run complete: would update ${updatedCount} properties ` +
        `(skipped invalid phone: ${skippedInvalidPhone}, skipped no admin: ${skippedNoAdmin})`
    );
  } else {
    console.log(
      `✓ Legacy phantom-owner backfill complete: updated ${updatedCount} properties ` +
        `(skipped invalid phone: ${skippedInvalidPhone}, skipped no admin: ${skippedNoAdmin})`
    );
  }
}

// Create database schema
async function createDatabaseSchema() {
  let connection;

  try {
    const targetDb = assertApplicationDatabaseName(dbConfig.database);
    const serverConfig = { ...dbConfig, database: undefined };

    connection = await mysql.createConnection(serverConfig);
    console.log('Connected to MySQL server');

    if (targetDb) {
      try {
        await connection.execute(
          `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(
            targetDb
          )} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        console.log(`✓ Ensured database exists: ${targetDb}`);
      } catch (createDbErr) {
        const code = createDbErr?.code || createDbErr?.errno;
        if (
          code === 'ER_DBACCESS_DENIED_ERROR' ||
          code === 1044 ||
          createDbErr?.errno === 1044
        ) {
          console.warn(
            `Could not CREATE DATABASE "${targetDb}" (no permission — common on RDS/Aurora). ` +
              'Ensure this database already exists in the console, then continuing with tables.'
          );
        } else {
          throw createDbErr;
        }
      }
    }

    await connection.end();

    const configWithDb = { ...dbConfig, database: targetDb };
    connection = await mysql.createConnection(configWithDb);
    console.log(`Connected to MySQL database "${targetDb}" — running CREATE TABLE IF NOT EXISTS / migrations`);

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
    // 2b. ADMIN_USERS TABLE
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        admin_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_admin_user (user_id),
        INDEX idx_admin_users_is_active (is_active),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created admin_users table');

    // ============================================
    // 2c. PROPERTY_OWNER_PROFILES TABLE
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS phantom_property_owner_profiles (
        owner_profile_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_name VARCHAR(255) NOT NULL,
        owner_phone_number VARCHAR(20) NOT NULL,
        source ENUM('manual_admin') NOT NULL DEFAULT 'manual_admin',
        created_by_user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phantom_property_owner_profiles_phone (owner_phone_number),
        INDEX idx_phantom_property_owner_profiles_creator (created_by_user_id),
        FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT
      )
    `);
    console.log('✓ Created phantom_property_owner_profiles table');

    // ============================================
    // DESTRUCTIVE RESET FOR PROPERTY STACK (cutover)
    // ============================================
    // Drop dependent tables first so properties can be recreated safely.
    // await connection.execute('DROP TABLE IF EXISTS chat_messages');
    // await connection.execute('DROP TABLE IF EXISTS chat_threads');
    // await connection.execute('DROP TABLE IF EXISTS property_images');
    // await connection.execute('DROP TABLE IF EXISTS property_amenities');
    // await connection.execute('DROP TABLE IF EXISTS saved_properties');
    // await connection.execute('DROP TABLE IF EXISTS properties');
    // console.log('✓ Reset property tables for spatial cutover');

    // ============================================
    // 3. PROPERTIES TABLE (Main table - optimized for filtering)
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS properties (
        property_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NULL,
        owner_profile_id INT NULL,
        ownership_mode ENUM('registered_owner', 'phantom_owner') NOT NULL DEFAULT 'registered_owner',
        chat_owner_user_id INT NULL,
        
        -- Basic Info
        property_for ENUM('rent', 'sell') NOT NULL,
        property_type ENUM('apartment', 'independent-house', 'villa', 'builder-floor', 'studio', 'penthouse', 'commercial', 'pg') NOT NULL,
        bhk_type VARCHAR(10) NOT NULL, -- '1', '2', '3', '4+', etc.
        
        -- Location
        address_text TEXT NULL,
        locality VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        pincode VARCHAR(10) NOT NULL,
        location POINT NOT NULL SRID 4326,
        
        -- Property Details
        built_up_area INT NULL, -- in sq ft (nullable for PG)
        carpet_area INT NULL, -- nullable for PG
        total_floors INT NOT NULL,
        floor_number INT NOT NULL,
        bedrooms INT,
        bathrooms INT,
        balconies INT DEFAULT 0,
        property_age ENUM('0-1', '1-3', '3-5', '5-10', '10+') NOT NULL,
        furnishing ENUM('fully-furnished', 'semi-furnished', 'unfurnished') NULL, -- nullable for PG
        facing ENUM('north', 'south', 'east', 'west', 'north-east', 'north-west', 'south-east', 'south-west'),
        
        -- Pricing
        expected_price DECIMAL(12, 2) NOT NULL,
        price_negotiable BOOLEAN DEFAULT FALSE,
        maintenance_charges DECIMAL(10, 2), -- for rent
        security_deposit DECIMAL(12, 2), -- for rent
        
        -- Description
        description TEXT,
        type_specific_data JSON NULL, -- per-type metadata (e.g. PG fields)
        
        -- Availability
        available_from DATE,
        
        -- Status
        status ENUM('active', 'inactive', 'rented', 'sold', 'pending') DEFAULT 'active',
        is_verified BOOLEAN DEFAULT FALSE,
        is_rented_out BOOLEAN NOT NULL DEFAULT FALSE,
        rented_out_by ENUM('himhomes', 'other') NULL,
        secondary_phone_number VARCHAR(20) NULL,
        
        -- Metadata
        views_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (owner_profile_id) REFERENCES phantom_property_owner_profiles(owner_profile_id) ON DELETE SET NULL,
        FOREIGN KEY (chat_owner_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
        
        -- CRITICAL INDEXES FOR FILTERING (Performance optimization)
        INDEX idx_property_for (property_for),
        INDEX idx_ownership_mode (ownership_mode),
        INDEX idx_owner_profile_id (owner_profile_id),
        INDEX idx_chat_owner_user_id (chat_owner_user_id),
        INDEX idx_bhk_type (bhk_type),
        INDEX idx_property_type (property_type),
        INDEX idx_price (expected_price),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_furnishing (furnishing),
        INDEX idx_status_rental_created_at (status, is_rented_out, rented_out_by, created_at),
        SPATIAL INDEX idx_location (location),
        
        -- COMPOSITE INDEXES for common filter combinations
        INDEX idx_for_city_locality_bhk (property_for, city, locality, bhk_type),
        INDEX idx_for_price (property_for, expected_price)
      )
    `);
    console.log('✓ Created properties table with optimized indexes');

    // Backward-compatible migration for existing DBs where rental lifecycle columns/index may not exist
    const [isRentedOutColumnRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'is_rented_out'
      LIMIT 1
      `,
      [targetDb]
    );
    if (isRentedOutColumnRows.length === 0) {
      await connection.execute(`
        ALTER TABLE properties
        ADD COLUMN is_rented_out BOOLEAN NOT NULL DEFAULT FALSE
      `);
    }

    const [rentedOutByColumnRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'rented_out_by'
      LIMIT 1
      `,
      [targetDb]
    );
    if (rentedOutByColumnRows.length === 0) {
      await connection.execute(`
        ALTER TABLE properties
        ADD COLUMN rented_out_by ENUM('himhomes', 'other') NULL
      `);
    }

    const [secondaryPhoneColumnRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'secondary_phone_number'
      LIMIT 1
      `,
      [targetDb]
    );
    if (secondaryPhoneColumnRows.length === 0) {
      await connection.execute(`
        ALTER TABLE properties
        ADD COLUMN secondary_phone_number VARCHAR(20) NULL
      `);
    }

    const [statusRentalIndexRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND INDEX_NAME = 'idx_status_rental_created_at'
      LIMIT 1
      `,
      [targetDb]
    );
    if (statusRentalIndexRows.length === 0) {
      await connection.execute(`
        CREATE INDEX idx_status_rental_created_at
        ON properties (status, is_rented_out, rented_out_by, created_at)
      `);
    }

    const [ownerIdColumnRows] = await connection.execute(
      `
      SELECT IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'owner_id'
      LIMIT 1
      `,
      [targetDb]
    );
    if (ownerIdColumnRows.length > 0 && ownerIdColumnRows[0].IS_NULLABLE !== 'YES') {
      await connection.execute(`
        ALTER TABLE properties
        MODIFY COLUMN owner_id INT NULL
      `);
    }

    const [ownerProfileIdColumnRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'owner_profile_id'
      LIMIT 1
      `,
      [targetDb]
    );
    if (ownerProfileIdColumnRows.length === 0) {
      await connection.execute(`
        ALTER TABLE properties
        ADD COLUMN owner_profile_id INT NULL
      `);
    }

    const [ownershipModeColumnRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'ownership_mode'
      LIMIT 1
      `,
      [targetDb]
    );
    if (ownershipModeColumnRows.length === 0) {
      await connection.execute(`
        ALTER TABLE properties
        ADD COLUMN ownership_mode ENUM('registered_owner', 'phantom_owner') NOT NULL DEFAULT 'registered_owner'
      `);
    }

    const [chatOwnerUserIdColumnRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'chat_owner_user_id'
      LIMIT 1
      `,
      [targetDb]
    );
    if (chatOwnerUserIdColumnRows.length === 0) {
      await connection.execute(`
        ALTER TABLE properties
        ADD COLUMN chat_owner_user_id INT NULL
      `);
    }

    const [ownershipModeIndexRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND INDEX_NAME = 'idx_ownership_mode'
      LIMIT 1
      `,
      [targetDb]
    );
    if (ownershipModeIndexRows.length === 0) {
      await connection.execute(`
        CREATE INDEX idx_ownership_mode ON properties (ownership_mode)
      `);
    }

    const [ownerProfileIdIndexRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND INDEX_NAME = 'idx_owner_profile_id'
      LIMIT 1
      `,
      [targetDb]
    );
    if (ownerProfileIdIndexRows.length === 0) {
      await connection.execute(`
        CREATE INDEX idx_owner_profile_id ON properties (owner_profile_id)
      `);
    }

    const [chatOwnerUserIdIndexRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND INDEX_NAME = 'idx_chat_owner_user_id'
      LIMIT 1
      `,
      [targetDb]
    );
    if (chatOwnerUserIdIndexRows.length === 0) {
      await connection.execute(`
        CREATE INDEX idx_chat_owner_user_id ON properties (chat_owner_user_id)
      `);
    }

    const [ownerProfileFkRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'owner_profile_id'
        AND REFERENCED_TABLE_NAME = 'phantom_property_owner_profiles'
      LIMIT 1
      `,
      [targetDb]
    );
    if (ownerProfileFkRows.length === 0) {
      await connection.execute(`
        ALTER TABLE properties
        ADD CONSTRAINT fk_properties_owner_profile
        FOREIGN KEY (owner_profile_id) REFERENCES phantom_property_owner_profiles(owner_profile_id)
        ON DELETE SET NULL
      `);
    }

    const [chatOwnerFkRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'chat_owner_user_id'
        AND REFERENCED_TABLE_NAME = 'users'
      LIMIT 1
      `,
      [targetDb]
    );
    if (chatOwnerFkRows.length === 0) {
      await connection.execute(`
        ALTER TABLE properties
        ADD CONSTRAINT fk_properties_chat_owner_user
        FOREIGN KEY (chat_owner_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
      `);
    }
    const [propertyTypeColumnRows] = await connection.execute(
      `
      SELECT COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'property_type'
      LIMIT 1
      `,
      [targetDb]
    );
    const propertyTypeColumnType = String(propertyTypeColumnRows?.[0]?.COLUMN_TYPE || '');
    const deprecatedPropertyTypes = ['villa', 'builder-floor', 'studio', 'penthouse'];
    const hasDeprecatedPropertyTypesInEnum = deprecatedPropertyTypes.some((type) =>
      propertyTypeColumnType.includes(`'${type}'`)
    );
    const missingAllowedPropertyTypeInEnum =
      !propertyTypeColumnType.includes("'apartment'") ||
      !propertyTypeColumnType.includes("'independent-house'") ||
      !propertyTypeColumnType.includes("'commercial'") ||
      !propertyTypeColumnType.includes("'pg'");

    if (hasDeprecatedPropertyTypesInEnum || missingAllowedPropertyTypeInEnum) {
      const [deprecatedTypeRows] = await connection.execute(
        `
        SELECT property_type, COUNT(*) AS total
        FROM properties
        WHERE property_type IN ('villa', 'builder-floor', 'studio', 'penthouse')
        GROUP BY property_type
        `
      );

      if (deprecatedTypeRows.length > 0) {
        const countsSummary = deprecatedTypeRows
          .map((row) => `${row.property_type}: ${row.total}`)
          .join(', ');
        throw new Error(
          `Cannot tighten properties.property_type enum; deprecated values exist (${countsSummary}). ` +
          'Migrate or delete these rows before startup.'
        );
      }

      await connection.execute(`
        ALTER TABLE properties
        MODIFY COLUMN property_type ENUM(
          'apartment',
          'independent-house',
          'commercial',
          'pg'
        ) NOT NULL
      `);
      console.log('✓ Tightened properties.property_type enum to active values only');
    }
    const [typeSpecificDataColumnRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'type_specific_data'
      LIMIT 1
      `,
      [targetDb]
    );
    if (typeSpecificDataColumnRows.length === 0) {
      await connection.execute(`
        ALTER TABLE properties
        ADD COLUMN type_specific_data JSON NULL
      `);
    }

    const [builtUpAreaNullabilityRows] = await connection.execute(
      `
      SELECT IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'built_up_area'
      LIMIT 1
      `,
      [targetDb]
    );
    if (builtUpAreaNullabilityRows.length > 0 && builtUpAreaNullabilityRows[0].IS_NULLABLE !== 'YES') {
      await connection.execute(`
        ALTER TABLE properties
        MODIFY COLUMN built_up_area INT NULL
      `);
    }

    const [carpetAreaNullabilityRows] = await connection.execute(
      `
      SELECT IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'carpet_area'
      LIMIT 1
      `,
      [targetDb]
    );
    if (carpetAreaNullabilityRows.length > 0 && carpetAreaNullabilityRows[0].IS_NULLABLE !== 'YES') {
      await connection.execute(`
        ALTER TABLE properties
        MODIFY COLUMN carpet_area INT NULL
      `);
    }

    const [furnishingNullabilityRows] = await connection.execute(
      `
      SELECT IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'furnishing'
      LIMIT 1
      `,
      [targetDb]
    );
    if (furnishingNullabilityRows.length > 0 && furnishingNullabilityRows[0].IS_NULLABLE !== 'YES') {
      await connection.execute(`
        ALTER TABLE properties
        MODIFY COLUMN furnishing ENUM('fully-furnished', 'semi-furnished', 'unfurnished') NULL
      `);
    }
    console.log('✓ Ensured properties rental lifecycle and ownership columns/indexes exist');

    // --------------------------------------------
    // Rollout phase: optional legacy phantom-owner backfill
    // --------------------------------------------
    // This is intentionally opt-in and disabled by default so schema rollout
    // remains non-breaking in all environments. When enabled, existing
    // admin-posted listings that used secondary_phone_number are converted to
    // phantom_owner mode and linked to owner profiles.
    await runLegacyAdminPhantomBackfill(connection);

    // ============================================
    // 3b. PROPERTY_OWNER_CLAIMS TABLE
    // ============================================
    // Immutable audit log for "claim later" conversions:
    // - A property initially posted in phantom mode points to
    //   phantom_property_owner_profiles.owner_profile_id.
    // - When that real owner signs up and we transfer ownership to users.user_id,
    //   we insert one row here to preserve historical traceability.
    // - This table should be append-only from application logic (no updates/deletes),
    //   so we can answer who claimed what, when, and by whom.
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS property_owner_claims (
        owner_claim_id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT NOT NULL, -- property being transferred
        owner_profile_id INT NOT NULL, -- phantom owner profile before claim
        claimed_user_id INT NOT NULL, -- registered user after claim
        claimed_by_admin_id INT NULL, -- admin who executed claim (nullable for self-claim/auto)
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- claim audit timestamp
        FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE CASCADE,
        FOREIGN KEY (owner_profile_id) REFERENCES phantom_property_owner_profiles(owner_profile_id) ON DELETE RESTRICT,
        FOREIGN KEY (claimed_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
        FOREIGN KEY (claimed_by_admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
        INDEX idx_property_owner_claims_property (property_id),
        INDEX idx_property_owner_claims_owner_profile (owner_profile_id),
        INDEX idx_property_owner_claims_claimed_user (claimed_user_id),
        INDEX idx_property_owner_claims_claimed_at (claimed_at)
      )
    `);
    console.log('✓ Created property_owner_claims table');

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
    // 8. PROPERTY_DELETION_FEEDBACK TABLE
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS property_deletion_feedback (
        feedback_id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT NOT NULL,
        owner_id INT NULL,
        rented_via_himhomes BOOLEAN NOT NULL,
        property_for ENUM('rent', 'sell') NULL,
        property_type VARCHAR(64) NULL,
        city VARCHAR(100) NULL,
        locality VARCHAR(255) NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE SET NULL,
        INDEX idx_owner_deleted_at (owner_id, deleted_at),
        INDEX idx_rented_via_himhomes (rented_via_himhomes)
      )
    `);
    console.log('✓ Created property_deletion_feedback table');

    // ============================================
    // 9. CHAT_THREADS TABLE
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
    // 10. CHAT_MESSAGES TABLE
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
    // 11. SUPPORT_QUERIES TABLE (Customer care submissions)
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS support_queries (
        support_query_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        email VARCHAR(255) NULL,
        phone_number VARCHAR(20) NULL,
        query_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
        INDEX idx_user_created (user_id, created_at),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✓ Created support_queries table');

    // ============================================
    // 12. FEEDBACK_SUBMISSIONS TABLE
    // ============================================
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feedback_submissions (
        feedback_submission_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        email VARCHAR(255) NULL,
        phone_number VARCHAR(20) NULL,
        feedback_text TEXT NOT NULL,
        status ENUM('new', 'in-progress', 'resolved', 'closed') NOT NULL DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
        INDEX idx_user_created (user_id, created_at),
        INDEX idx_created_at (created_at),
        INDEX idx_status (status)
      )
    `);
    console.log('✓ Created feedback_submissions table');

    // Backward-compatible migration for existing DBs where status column or index may not exist
    const [statusColumnRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'feedback_submissions'
        AND COLUMN_NAME = 'status'
      LIMIT 1
      `,
      [dbConfig.database]
    );
    if (statusColumnRows.length === 0) {
      await connection.execute(`
        ALTER TABLE feedback_submissions
        ADD COLUMN status ENUM('new', 'in-progress', 'resolved', 'closed') NOT NULL DEFAULT 'new'
      `);
    }

    const [statusIndexRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'feedback_submissions'
        AND INDEX_NAME = 'idx_status'
      LIMIT 1
      `,
      [dbConfig.database]
    );
    if (statusIndexRows.length === 0) {
      await connection.execute(`
        CREATE INDEX idx_status ON feedback_submissions (status)
      `);
    }
    console.log('✓ Ensured feedback_submissions.status column exists');

    // Users: chat digest preferences and send tracking (idempotent for existing DBs)
    const [emailChatDigestRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'email_chat_digest'
      LIMIT 1
      `,
      [dbConfig.database]
    );
    if (emailChatDigestRows.length === 0) {
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN email_chat_digest BOOLEAN NOT NULL DEFAULT TRUE
      `);
    }

    const [lastChatDigestRows] = await connection.execute(
      `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'last_chat_digest_sent_at'
      LIMIT 1
      `,
      [dbConfig.database]
    );
    if (lastChatDigestRows.length === 0) {
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN last_chat_digest_sent_at TIMESTAMP NULL DEFAULT NULL
      `);
    }
    console.log('✓ Ensured users.email_chat_digest and users.last_chat_digest_sent_at exist');

    // ============================================
    // 13. INQUIRIES TABLE (Contact requests)
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
    // 14. INSERT DEFAULT AMENITIES
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

// CLI only: `node storage/createTables.js` — do not auto-run when required by server.js
if (require.main === module) {
  createDatabaseSchema()
    .then(() => {
      console.log('\n🎉 All tables created successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create schema:', error);
      process.exit(1);
    });
}

module.exports = { createDatabaseSchema };