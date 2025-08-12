# Enhanced Mailbox with JSONB Data Processing

## Overview
The Mailbox component has been enhanced to process and display rich data from JSONB columns in the `incoming_mails` table, providing intelligent analysis, priority-based deadlines, and categorized recommendations.

## Features

### 1. JSONB Data Processing
- **extracted_data**: Raw API response data with document information
- **deadlines**: Processed deadlines with priority calculations
- **recommendations**: Smart recommendations with categories and priorities
- **document metadata**: File access and document information

### 2. Priority System
- **High Priority (Red)**: Deadlines within 7 days or overdue
- **Medium Priority (Orange)**: Deadlines within 30 days
- **Low Priority (Green)**: Deadlines beyond 30 days

### 3. Category Grouping
- **Financial**: Tax, VAT, payment-related recommendations
- **Administrative**: Deadlines, urgent actions, reviews
- **Tax**: Tax-specific documents and requirements
- **Penalty**: Fine and penalty-related items
- **Legal**: Legal agreements and compliance

### 4. Enhanced Display
- Priority indicators with color coding
- **Comprehensive extracted data visualization** with categorized fields:
  - Financial Information (amount, currency, tax amounts)
  - Dates and Deadlines (due dates, issue dates, expiry dates)
  - Document Information (types, numbers, references)
  - Company and Entity Information (names, IDs, numbers)
  - Tax and Period Information (periods, years, rates)
  - Additional dynamic fields with automatic formatting
- Categorized recommendations with priority badges
- File access controls for storage bucket files

## Database Schema

### incoming_mails Table
```sql
CREATE TABLE incoming_mails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  document_type TEXT,
  issue_date DATE,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_id UUID REFERENCES auth.users(id),
  
  -- JSONB Columns for Enhanced Data
  extracted_data JSONB,      -- Raw API response data
  deadlines JSONB,           -- Processed deadlines with priorities
  recommendations JSONB,     -- Categorized recommendations
  summary TEXT               -- AI-generated summary
);
```

### JSONB Structure Examples

#### extracted_data
```json
{
  // Financial Information
  "amount": "2,450.00",
  "currency": "EUR",
  "tax_amount": "490.00",
  "total_amount": "2,450.00",
  
  // Dates and Deadlines
  "due_date": "2024-02-15",
  "issue_date": "2024-01-15",
  "payment_date": null,
  "expiry_date": "2024-03-15",
  
  // Document Information
  "document_type": "VAT Assessment",
  "reference_number": "VAT-2024-001",
  "invoice_number": "INV-2024-001",
  "case_number": "CASE-2024-001",
  
  // Company and Entity Information
  "company_name": "Sample Corp BV",
  "tax_id": "NL123456789B01",
  "vat_number": "NL123456789B01",
  "kvk_number": "12345678",
  
  // Tax and Period Information
  "tax_period": "Q4 2023",
  "fiscal_year": "2023",
  "tax_rate": "21",
  
  // Additional Fields
  "assessment_type": "Regular",
  "payment_method": "Bank Transfer",
  "late_fee_applicable": true,
  "interest_rate": "4.5",
  "appeal_rights": true,
  "contact_person": "John Doe",
  "phone_number": "+31 20 123 4567",
  "email": "tax@samplecorp.nl",
  "address": "Sample Street 123, 1000 AB Amsterdam",
  "postal_code": "1000 AB",
  "city": "Amsterdam",
  "country": "Netherlands"
}
```

#### deadlines
```json
[
  {
    "date": "2024-02-15",
    "type": "VAT Payment Due",
    "description": "Payment must be received by this date",
    "priority": "high",
    "daysUntilDeadline": 5,
    "isOverdue": false
  }
]
```

#### recommendations
```json
[
  {
    "text": "Review VAT calculations for accuracy",
    "category": "Financial",
    "priority": "high"
  },
  {
    "text": "Consider payment plan if funds are limited",
    "category": "Financial",
    "priority": "medium"
  }
]
```

## Implementation Details

### 1. Data Fetching
The `fetchIncomingMail` function now retrieves all JSONB columns and processes them for display:

```javascript
const { data, error } = await supabase
  .from('incoming_mails')
  .select(`
    id, document_name, document_type, issue_date, file_path,
    created_at, client_id, extracted_data, deadlines, 
    recommendations, summary
  `)
  .order('created_at', { ascending: false });
```

### 2. Priority Calculation
Deadlines are automatically prioritized based on proximity:

```javascript
const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

if (daysUntilDeadline <= 7) deadlinePriority = 'high';
else if (daysUntilDeadline <= 30) deadlinePriority = 'medium';
else deadlinePriority = 'low';
```

### 3. Category Detection
Recommendations are automatically categorized based on content analysis:

```javascript
if (recLower.includes('tax') || recLower.includes('vat') || recLower.includes('payment')) {
  category = 'Financial';
  priority = 'high';
} else if (recLower.includes('deadline') || recLower.includes('urgent')) {
  category = 'Administrative';
  priority = 'high';
}
```

### 4. Enhanced Analysis Modal
The `AnalysisModal` component displays:
- Document metadata in organized cards
- **Comprehensive extracted data display** with:
  - **Financial Information**: Amount, currency, tax amounts, total amounts
  - **Dates and Deadlines**: Due dates, issue dates, payment dates, expiry dates
  - **Document Information**: Types, reference numbers, invoice numbers, case numbers
  - **Company and Entity Information**: Company names, tax IDs, VAT numbers, KVK numbers
  - **Tax and Period Information**: Tax periods, fiscal years, tax rates
  - **Dynamic Field Rendering**: Automatically displays any additional fields from JSONB
- Priority-based deadline display with visual indicators
- Categorized recommendations with priority badges
- File access controls for storage bucket files

## Usage

### 1. Load Sample Data
Click the "Load Sample Data" button in the incoming mail tab to see the enhanced features in action.

### 2. View Analysis
Click the AI Analysis button on any mail item to see the detailed breakdown of:
- Extracted information
- Priority-based deadlines
- Categorized recommendations
- File access options

### 3. Priority Indicators
- **URGENT**: Red badges for high-priority items
- **SOON**: Orange badges for medium-priority items
- **AI ANALYZED**: Green badges for processed documents

## Styling

### Priority Colors
- **High Priority**: `#ff4444` (Red)
- **Medium Priority**: `#ff8800` (Orange)
- **Low Priority**: `#4CAF50` (Green)

### Category Icons
- **Financial**: 💰
- **Administrative**: 📋
- **Tax**: 🧾
- **Penalty**: ⚠️
- **Legal**: ⚖️

## Testing

The component includes a sample data function that creates realistic test data:

```javascript
const createSampleData = () => {
  // Creates a sample VAT assessment notice with all JSONB fields populated
  // Demonstrates priority calculation, category grouping, and enhanced display
};
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live data updates
2. **Advanced Filtering**: Filter by priority, category, or date ranges
3. **Bulk Actions**: Process multiple documents simultaneously
4. **Export Options**: PDF/CSV export of analysis results
5. **Integration**: Connect with calendar and task management systems

## Dependencies

- React 18+
- Supabase client
- React Router for navigation
- Date-fns for date manipulation
- HTML2Canvas for PDF export

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- JSONB parsing is optimized with try-catch blocks
- Priority calculations are memoized where possible
- Large datasets are paginated for optimal performance
- File access uses signed URLs for security and performance 