-- create-users.sql
CREATE TABLE IF NOT EXISTS users 
(
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    department VARCHAR(50),
    display_name VARCHAR(255)
);

-- Admin
INSERT INTO users (username, password, role, department, display_name) VALUES
    ('Harriet Mburu', 'Hattyjohninvestments1@2026', 'admin', NULL, 'Harriet Mburu')
ON CONFLICT (username) DO NOTHING;

-- Uniform Department
INSERT INTO users (username, password, role, department, display_name) VALUES
    ('Stella', 'Stella', 'department_uniform', 'Uniform', 'Stella (Uniform)'),
    ('Irene', 'Irene', 'department_uniform', 'Uniform', 'Irene (Uniform)'),
    ('Margaret', 'Margaret', 'department_uniform', 'Uniform', 'Margaret (Uniform)')
ON CONFLICT (username) DO NOTHING;

-- Stationery Department
INSERT INTO users (username, password, role, department, display_name) VALUES
    ('Stella', 'Stella', 'department_stationery', 'Stationery', 'Stella (Stationery)'),
    ('Irene', 'Irene', 'department_stationery', 'Stationery', 'Irene (Stationery)'),
    ('Margaret', 'Margaret', 'department_stationery', 'Stationery', 'Margaret (Stationery)')
ON CONFLICT (username) DO NOTHING;