-- Vinnova Integration Database Schema

-- Grants Table
CREATE TABLE grants (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  deadline DATE,
  sector TEXT,
  stage TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Applications Table
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  grant_id TEXT REFERENCES grants(id) ON DELETE SET NULL,
  title TEXT,
  status TEXT,
  decision_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activities Table
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_grants_deadline ON grants(deadline);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_activities_start_date ON activities(start_date);

-- Trigger function to update 'updated_at' on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_grants_updated_at
BEFORE UPDATE ON grants
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); 