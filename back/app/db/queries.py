# SQL queries for users table

# Create users table
CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone INTEGER NOT NULL,
    address VARCHAR(200) NOT NULL,
    vineyard_name VARCHAR(100) NOT NULL,
    hectares INTEGER NOT NULL,
    grape_type VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

# Insert new user
INSERT_USER = """
INSERT INTO users (name, last_name, email, phone, address, vineyard_name, hectares, grape_type, password)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
RETURNING id;
"""

# Get user by ID
GET_USER_BY_ID = """
SELECT id, name, last_name, email, phone, address, vineyard_name, hectares, grape_type, created_at
FROM users
WHERE id = %s;
"""

# Get user by email
GET_USER_BY_EMAIL = """
SELECT id, name, last_name, email, phone, address, vineyard_name, hectares, grape_type, password, created_at
FROM users
WHERE email = %s;
"""

# Update user
UPDATE_USER = """
UPDATE users
SET name = %s,
    last_name = %s,
    email = %s,
    phone = %s,
    address = %s,
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
SELECT id, name, last_name, email, phone, address, vineyard_name, hectares, grape_type, created_at
FROM users;
""" 