-- Create channels table for Supabase
-- This table stores user-created channels for document organization

CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic channel information
  title VARCHAR(255) NOT NULL,
  process_type VARCHAR(100) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
  due_date DATE,
  description TEXT,
  
  -- Auto-attach document settings
  detect_by_reference VARCHAR(100),
  tax_id_rsin VARCHAR(100),
  company_name VARCHAR(255),
  
  -- Channel status and metadata
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'Active',
  
  -- User relationship
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_process_type ON channels(process_type);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_created_at ON channels(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_channels_updated_at 
  BEFORE UPDATE ON channels 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own channels
CREATE POLICY "Users can view own channels" ON channels
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own channels
CREATE POLICY "Users can insert own channels" ON channels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own channels
CREATE POLICY "Users can update own channels" ON channels
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own channels
CREATE POLICY "Users can delete own channels" ON channels
  FOR DELETE USING (auth.uid() = user_id);

-- Insert some sample data (optional)
INSERT INTO channels (title, process_type, priority, due_date, detect_by_reference, tax_id_rsin, company_name, user_id) VALUES
  ('Corporate Tax 2024', 'Corporate Tax', 'High', '2024-12-31', 'CT.2024', 'NL123456789B01', 'Acme Holdings B.V.', 
   (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON channels TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

