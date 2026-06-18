ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS playlist JSONB DEFAULT '[]'::jsonb;
