-- =====================================================================
-- PRODUCTION SCHEMA UPDATE
-- Features: Regions + "Account Officer" role rename
-- Target DB: u377876889_monthly_due   (MySQL 8 / MariaDB)
-- How to run: Hostinger hPanel -> Databases -> phpMyAdmin -> select the
--             database -> SQL tab -> paste this whole file -> Go.
-- This script is idempotent: running it more than once is harmless.
-- =====================================================================

-- 1) regions table ---------------------------------------------------
CREATE TABLE IF NOT EXISTS regions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  serial_number VARCHAR(20) NOT NULL,
  coordinator_id INT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY regions_serial_number_unique (serial_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) zones.region_id (add only if missing) ---------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'zones' AND COLUMN_NAME = 'region_id');
SET @s := IF(@c = 0, 'ALTER TABLE zones ADD COLUMN region_id INT UNSIGNED NULL', 'DO 0');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) users.region_id (add only if missing) ---------------------------
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'users' AND COLUMN_NAME = 'region_id');
SET @s := IF(@c = 0, 'ALTER TABLE users ADD COLUMN region_id INT UNSIGNED NULL', 'DO 0');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Region Management role (insert only if missing) -----------------
INSERT INTO roles (name)
SELECT 'Region Management'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Region Management');

-- 5) Rename Unit Management -> Account Officer -----------------------
UPDATE roles SET name = 'Account Officer' WHERE name = 'Unit Management';

-- 6) Verify ----------------------------------------------------------
SELECT id, name FROM roles ORDER BY id;
SHOW COLUMNS FROM zones LIKE 'region_id';
SHOW COLUMNS FROM users LIKE 'region_id';
