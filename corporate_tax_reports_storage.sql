-- SQL Queries for Corporate Tax Reports Storage

-- 1. Create storage bucket for corporate tax reports
-- Run this in Supabase SQL Editor

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'corporate-tax-reports',
  'corporate-tax-reports',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
);

-- 2. Set up storage policies for the bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload corporate tax reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'corporate-tax-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own reports
CREATE POLICY "Allow users to view their own corporate tax reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'corporate-tax-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own reports
CREATE POLICY "Allow users to update their own corporate tax reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'corporate-tax-reports' AND
  auth.uid()::text = (storage.foldetails(name))[1]
);

-- Allow users to delete their own reports
CREATE POLICY "Allow users to delete their own corporate tax reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'corporate-tax-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Add report_url column to corporate_tax_analysis table
-- Run this if the table already exists

-- Check if column exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'corporate_tax_analysis' 
    AND column_name = 'report_url'
  ) THEN
    ALTER TABLE corporate_tax_analysis 
    ADD COLUMN report_url TEXT;
    
    -- Add comment for documentation
    COMMENT ON COLUMN corporate_tax_analysis.report_url IS 'URL to the generated PDF report in storage';
  END IF;
END $$;

-- 4. Create index on report_url for better performance
CREATE INDEX IF NOT EXISTS idx_corporate_tax_analysis_report_url 
ON corporate_tax_analysis(report_url);

-- 5. Create a view for easier access to reports with user info
CREATE OR REPLACE VIEW corporate_tax_reports_view AS
SELECT 
  cta.id,
  cta.user_id,
  cta.company_name,
  cta.fiscal_year,
  cta.report_url,
  cta.created_at,
  cta.status,
  cta.final_tax_owed,
  cta.taxable_income,
  -- Add user email if available
  (SELECT email FROM auth.users WHERE id = cta.user_id) as user_email
FROM corporate_tax_analysis cta
WHERE cta.report_url IS NOT NULL
ORDER BY cta.created_at DESC;

-- 6. Grant permissions to authenticated users
GRANT SELECT ON corporate_tax_reports_view TO authenticated;

-- 7. Create function to get report URL by analysis ID
CREATE OR REPLACE FUNCTION get_corporate_tax_report_url(analysis_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  report_url TEXT;
  user_id UUID;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  -- Check if user is authenticated
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get the report URL for the specified analysis ID
  SELECT cta.report_url INTO report_url
  FROM corporate_tax_analysis cta
  WHERE cta.id = analysis_id 
    AND cta.user_id = user_id;
  
  -- Return the URL or NULL if not found
  RETURN report_url;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_corporate_tax_report_url(BIGINT) TO authenticated;




