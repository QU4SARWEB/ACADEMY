-- Plataforma de juego del usuario (PC o Mobile)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'pc';
