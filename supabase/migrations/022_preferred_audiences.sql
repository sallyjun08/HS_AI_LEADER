ALTER TABLE leader_profiles
  ADD COLUMN IF NOT EXISTS preferred_audiences text[] DEFAULT '{}';
