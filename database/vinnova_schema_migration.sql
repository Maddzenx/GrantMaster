-- Vinnova Integration Schema Migration

-- Add missing columns to grants
ALTER TABLE grants ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE grants ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE grants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE grants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add missing columns to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS grant_id TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add foreign key constraint for applications.grant_id
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_grant_id_fkey;
ALTER TABLE applications ADD CONSTRAINT applications_grant_id_fkey FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE SET NULL;

-- If activities.application_id is text, convert it to uuid (run manually if needed)
-- ALTER TABLE activities ALTER COLUMN application_id TYPE uuid USING application_id::uuid;

-- Create activities table if it does not exist
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grants_deadline ON grants(deadline);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_activities_start_date ON activities(start_date);

-- Trigger function to update 'updated_at' on row modification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  END IF;
END$$;

-- Triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_grants_updated_at'
  ) THEN
    CREATE TRIGGER update_grants_updated_at
    BEFORE UPDATE ON grants
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_applications_updated_at'
  ) THEN
    CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_activities_updated_at'
  ) THEN
    CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END$$; 