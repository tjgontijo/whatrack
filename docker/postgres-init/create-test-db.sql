SELECT 'CREATE DATABASE whatrack_test OWNER whatrack'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'whatrack_test')\gexec
