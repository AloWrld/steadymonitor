-- Create session table for connect-pg-simple
-- Run this with: psql -U steadyuser -d steadymonitor -f create-session-table.sql

-- Drop table if exists (optional)
-- DROP TABLE IF EXISTS user_sessions;

-- Create session table
CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire 
ON user_sessions(expire);

-- Create cleanup function (optional)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expire < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create view to see active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    sid,
    expire,
    sess->>'userId' as user_id,
    sess->>'username' as username,
    sess->>'userRole' as role,
    sess->>'userDisplayName' as display_name
FROM user_sessions 
WHERE expire > NOW();

-- Verify table creation
SELECT 
    'Session table created successfully' as message,
    COUNT(*) as existing_sessions
FROM user_sessions;

-- Show current sessions (will be empty initially)
SELECT * FROM active_sessions;