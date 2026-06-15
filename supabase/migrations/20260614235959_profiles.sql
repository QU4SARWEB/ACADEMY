-- Migration: Create profiles, applications, payments tables
-- Date: 2026-06-14

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INT,
  discord_user TEXT,
  valorant_name TEXT,
  rank TEXT,
  role TEXT,
  server TEXT,
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  membership_type TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create applications table (registration form data)
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  roles_of_interest JSONB DEFAULT '[]',
  objectives TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  registered_by UUID REFERENCES profiles(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "users_view_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admins_view_all" ON profiles
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'admin'
  ));

CREATE POLICY "insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "admins_update" ON profiles
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'admin'
  ));

-- Applications RLS policies
CREATE POLICY "users_view_own_apps" ON applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admins_all_apps" ON applications
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'admin'
  ));

CREATE POLICY "users_insert_app" ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payments RLS policies
CREATE POLICY "users_view_own_payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admins_all_payments" ON payments
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'admin'
  ));

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'), 'pending_payment');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
