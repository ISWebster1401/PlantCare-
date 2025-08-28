# SQL queries for users table

# Create users table
CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    region VARCHAR(100),
    vineyard_name VARCHAR(100),
    hectares INTEGER,
    grape_type VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);
"""

# Insert new user
INSERT_USER = """
INSERT INTO users (first_name, last_name, email, phone, region, vineyard_name, hectares, grape_type, password_hash)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
RETURNING id;
"""

# Get user by ID
GET_USER_BY_ID = """
SELECT id, first_name, last_name, email, phone, region, vineyard_name, hectares, grape_type, created_at, last_login, active
FROM users
WHERE id = %s;
"""

# Get user by email (includes password_hash for authentication)
GET_USER_BY_EMAIL = """
SELECT id, first_name, last_name, email, phone, region, vineyard_name, hectares, grape_type, password_hash, created_at, last_login, active
FROM users
WHERE email = %s;
"""

# Update user
UPDATE_USER = """
UPDATE users
SET first_name = %s,
    last_name = %s,
    email = %s,
    phone = %s,
    region = %s,
    vineyard_name = %s,
    hectares = %s,
    grape_type = %s
WHERE id = %s
RETURNING id;
"""

# Delete user
DELETE_USER = """
DELETE FROM users
WHERE id = %s
RETURNING id;
"""

# Get all users
GET_ALL_USERS = """
SELECT id, first_name, last_name, email, phone, region, vineyard_name, hectares, grape_type, created_at, last_login, active
FROM users
WHERE active = TRUE;
"""

# Update last login
UPDATE_LAST_LOGIN = """
UPDATE users
SET last_login = CURRENT_TIMESTAMP
WHERE id = %s;
""" 