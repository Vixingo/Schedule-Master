CREATE TABLE oauth_states (
    id SERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL,
    state_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clean old states periodically
CREATE INDEX idx_oauth_state_created ON oauth_states (created_at);


CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,       -- Google Calendar Event ID
    title TEXT NOT NULL,
    description TEXT,
    source_text TEXT,                    -- Original pasted announcement text
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    recurrence_rule TEXT,                -- RRULE string if recurring
    links TEXT[],                        -- array of links
    type TEXT,                           -- assignment, quiz, exam, etc.
    reminder_minutes INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster duplicate detection by user & date
CREATE INDEX idx_events_user_date ON events (user_id, start_time);


CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,      -- Discord user ID
    google_tokens TEXT,                   -- Encrypted Google OAuth tokens
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_update
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_users_timestamp();