-- Production migration for the Regions feature (run once in phpMyAdmin on
-- the u377876889_monthly_due DB). MySQL 8+ / MariaDB compatible.

ALTER TABLE zones ADD COLUMN region_id INT UNSIGNED NULL;
ALTER TABLE users ADD COLUMN region_id INT UNSIGNED NULL;

CREATE TABLE IF NOT EXISTS regions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  serial_number VARCHAR(20) NOT NULL,
  coordinator_id INT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY regions_serial_number_unique (serial_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (name)
SELECT 'Region Management'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Region Management');