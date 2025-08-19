# Corporate Tax Reports Storage Setup

This document explains how to set up the storage bucket for corporate tax reports in Supabase.

## Prerequisites

- Supabase project set up
- Access to Supabase SQL Editor
- Storage enabled in your Supabase project

## Setup Steps

### 1. Run the SQL Script

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `corporate_tax_reports_storage.sql`
4. Run the script

### 2. Verify Storage Bucket Creation

1. Go to Storage in your Supabase dashboard
2. You should see a new bucket called `corporate-tax-reports`
3. The bucket should have the following settings:
   - Public: true
   - File size limit: 50MB
   - Allowed MIME types: application/pdf

### 3. Verify Policies

The script creates the following storage policies:
- Users can upload files to their own folder
- Users can view their own reports
- Users can update their own reports
- Users can delete their own reports

### 4. Verify Database Changes

The script adds a `report_url` column to the `corporate_tax_analysis` table:
- Column name: `report_url`
- Type: TEXT
- Purpose: Stores the URL to the generated PDF report

## How It Works

1. When a user generates a PDF report:
   - The PDF is created using jsPDF
   - The PDF blob is uploaded to Supabase storage
   - The file is stored in the user's folder: `{userId}/{timestamp}_{filename}.pdf`
   - A public URL is generated for the file
   - The URL is saved to the `report_url` column in the database

2. When viewing saved analysis:
   - If a `report_url` exists, a "View Report" button is shown
   - Clicking the button opens the PDF in a new tab
   - Users can also download the report locally

## File Structure

```
corporate-tax-reports/
├── {userId1}/
│   ├── {timestamp}_CIT_Analysis_Report_Company_2024_2024-01-15.pdf
│   └── {timestamp}_CIT_Analysis_Report_Company_2024_2024-01-20.pdf
└── {userId2}/
    └── {timestamp}_CIT_Analysis_Report_Company_2024_2024-01-18.pdf
```

## Security

- Users can only access files in their own folder
- File paths are structured as `{userId}/{filename}` to ensure isolation
- Storage policies enforce user authentication and ownership

## Troubleshooting

### Common Issues

1. **Storage bucket not created**: Make sure you have storage enabled in your Supabase project
2. **Policies not working**: Verify that the policies were created successfully
3. **Upload errors**: Check that the user is authenticated and has the correct permissions

### Testing

1. Generate a PDF report in the application
2. Check the storage bucket for the uploaded file
3. Verify the `report_url` column is populated in the database
4. Test viewing the saved report

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify the SQL script ran successfully
3. Check Supabase logs for storage-related errors
4. Ensure all policies are properly configured
