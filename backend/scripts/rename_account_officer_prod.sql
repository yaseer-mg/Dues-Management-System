-- Production migration to rename Unit Management → Account Officer
UPDATE roles SET name = 'Account Officer' WHERE name = 'Unit Management' LIMIT 1;