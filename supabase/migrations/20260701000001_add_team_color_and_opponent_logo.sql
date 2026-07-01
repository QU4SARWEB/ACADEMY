-- Add color column to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS color text DEFAULT '#8B5CF6';

-- Add opponent_logo_url to scrims
ALTER TABLE scrims ADD COLUMN IF NOT EXISTS opponent_logo_url text;

-- Make season_id nullable in team_members (not always provided)
ALTER TABLE team_members ALTER COLUMN season_id DROP NOT NULL;
