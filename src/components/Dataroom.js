import React, { useState, useEffect } from 'react';
import './Dataroom.css';
import DocumentUploadModal from './DocumentUploadModal';
import { supabase } from './SupabaseClient';
import { useNavigate } from 'react-router-dom';

const initialDocTypes = [
  {
    icon: (
      <span className="dru-doc-icon dru-doc-icon-kyb">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#00D084"/>
          <path d="M12 14a3 3 0 100-6 3 3 0 000 6z" fill="#fff"/>
          <path d="M8 18c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </span>
    ),
    title: 'KYB Verification',
    type: 'kyc',
    count: 0,
    requiredDocs: [
      'Passport/ID Documents (Required)',
      'Proof of Address (Required)',
      'UBO Declaration (Required)',
      'Company Structure Chart (Optional)'
    ]
  },
  {
    icon: (
      <span className="dru-doc-icon dru-doc-icon-financial">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#3366FF"/>
          <rect x="8" y="14" width="2" height="4" rx="1" fill="#fff"/>
          <rect x="11" y="10" width="2" height="8" rx="1" fill="#fff"/>
          <rect x="14" y="7" width="2" height="11" rx="1" fill="#fff"/>
        </svg>
      </span>
    ),
    title: 'Financial Documents',
    type: 'financial',
    count: 0,
    requiredDocs: [
      'Invoices',
      'Financial Statements',
      'Tax & Compliance',
      'Banking & Investment',
      'Accounts Payable & Receivable',
      'Company Valuation & Shareholding',
      'Debt & Loan Documentation',
      'Other Documents'
    ]
  }
];

const financialCategories = [
  "Invoices",
  "Financial Statements",
  "Tax & Compliance",
  "Banking & Investment",
  "Accounts Payable & Receivable",
  "Company Valuation & Shareholding",
  "Debt & Loan Documentation",
  "Other Documents",
];



const Dataroom = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedFinancialCategory, setSelectedFinancialCategory] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loadingActions, setLoadingActions] = useState({});
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tooltip, setTooltip] = useState({ show: false, content: [], position: { x: 0, y: 0 } });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDocumentData, setSelectedDocumentData] = useState(null);
  const [docTypes, setDocTypes] = useState(initialDocTypes);

  // Fetch documents from Supabase
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        throw new Error('No user session found');
      }

      const userId = sessionData.session.user.id;

      // Fetch KYC documents
      const { data: kycDocs, error: kycError } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', userId);

      if (kycError) throw kycError;

      // Fetch financial documents
      const { data: financialDocs, error: financialError } = await supabase
        .from('financial_documents')
        .select('*')
        .eq('user_id', userId);

      if (financialError) throw financialError;

      // Fetch signed documents from kvk_signed_forms table
      const { data: signedDocs, error: signedError } = await supabase
        .from('kvk_signed_forms')
        .select('*')
        .eq('user_id', userId);

      if (signedError) throw signedError;

      // Fetch generated documents from form submission tables
      const [form6Data, form9Data, form11Data, form13Data] = await Promise.all([
        supabase.from('form_6_submissions').select('*').eq('user_id', userId),
        supabase.from('form_9_submissions').select('*').eq('user_id', userId),
        supabase.from('form_11_submissions').select('*').eq('user_id', userId),
        supabase.from('form_13_submissions').select('*').eq('user_id', userId)
      ]);

      // Combine and format documents
      const allDocs = [];
      
      // Format KYC documents
      if (kycDocs) {
        kycDocs.forEach(doc => {
          allDocs.push({
            id: doc.id,
            name: doc.file_name,
            type: 'kyc',
            category: doc.doc_type,
            year: new Date(doc.upload_date).getFullYear().toString(),
            uploadDate: doc.upload_date,
            fileSize: doc.file_size,
            status: doc.status || 'uploaded',
            filePath: doc.file_path,
            representativeId: doc.representative_id,
            extractedData: doc.extracted_data
          });
        });
      }

      // Format financial documents
      if (financialDocs) {
        financialDocs.forEach(doc => {
          allDocs.push({
            id: doc.id,
            name: doc.file_name,
            type: 'financial',
            category: doc.category || doc.doc_type,
            year: doc.year || new Date(doc.created_at).getFullYear().toString(),
            uploadDate: doc.created_at,
            fileSize: doc.file_size,
            status: 'uploaded',
            filePath: doc.file_path
          });
        });
      }

      // Format signed documents from kvk_signed_forms
      if (signedDocs) {
        signedDocs.forEach(doc => {
          allDocs.push({
            id: doc.id,
            name: doc.form_type || 'Signed Document',
            type: 'signed',
            category: doc.form_type,
            year: new Date(doc.created_at || doc.upload_date).getFullYear().toString(),
            uploadDate: doc.created_at || doc.upload_date,
            fileSize: doc.file_size || 0,
            status: doc.status || 'uploaded',
            filePath: doc.file_path,
            representativeId: doc.representative_id,
            extractedData: doc.extracted_data
          });
        });
      }

      // Format generated documents from form submissions
      const generatedDocs = [
        ...(form6Data.data || []).map(s => ({ ...s, formType: 'form-6' })),
        ...(form9Data.data || []).map(s => ({ ...s, formType: 'form-9' })),
        ...(form11Data.data || []).map(s => ({ ...s, formType: 'form-11' })),
        ...(form13Data.data || []).map(s => ({ ...s, formType: 'form-13' }))
      ];

      if (generatedDocs.length > 0) {
        generatedDocs.forEach(doc => {
          allDocs.push({
            id: doc.id,
            name: doc.formType || 'Generated Form',
            type: 'signed',
            category: doc.formType,
            year: new Date(doc.submission_date || doc.created_at).getFullYear().toString(),
            uploadDate: doc.submission_date || doc.created_at,
            fileSize: doc.file_size || 0,
            status: 'generated',
            filePath: doc.file_path,
            representativeId: doc.representative_id,
            extractedData: doc.extracted_data
          });
        });
      }

      setDocuments(allDocs);

      // Extract unique years
      const years = [...new Set(allDocs.map(doc => doc.year))].sort((a, b) => b - a);
      setAvailableYears(['all', ...years]);

    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter documents by year and document type
  useEffect(() => {
    let filtered = documents;

    // Filter by document type
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === documentTypeFilter);
    }

    // Filter by year
    if (selectedYear !== 'all') {
      filtered = filtered.filter(doc => doc.year === selectedYear);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query)
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, selectedYear, documentTypeFilter, searchQuery]);

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Update document counts when documents change
  useEffect(() => {
    const kycCount = documents.filter(doc => doc.type === 'kyc').length;
    const financialCount = documents.filter(doc => doc.type === 'financial').length;
    
    setDocTypes(prev => prev.map(doc => {
      if (doc.type === 'kyc') {
        return { ...doc, count: kycCount };
      } else if (doc.type === 'financial') {
        return { ...doc, count: financialCount };
      }
      return doc;
    }));
  }, [documents]);

  const openModal = (type) => {
    setSelectedType(type);
    setSelectedFinancialCategory(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedType(null);
    setSelectedFinancialCategory(null);
    setModalOpen(false);
    // Refresh documents after modal closes
    fetchDocuments();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getDocumentIcon = (type, category) => {
    if (type === 'kyc') {
      return (
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '8px', 
          background: '#00D084',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#fff" strokeWidth="2"/>
            <polyline points="14,2 14,8 20,8" stroke="#fff" strokeWidth="2"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="#fff" strokeWidth="2"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="#fff" strokeWidth="2"/>
            <polyline points="10,9 9,9 8,9" stroke="#fff" strokeWidth="2"/>
          </svg>
        </div>
      );
    } else if (type === 'signed') {
      return (
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '8px', 
          background: '#FF6B35',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#fff" strokeWidth="2"/>
            <polyline points="14,2 14,8 20,8" stroke="#fff" strokeWidth="2"/>
            <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 2v6" stroke="#fff" strokeWidth="2"/>
          </svg>
        </div>
      );
    } else {
      return (
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '8px', 
          background: '#3366FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#fff" strokeWidth="2"/>
            <polyline points="14,2 14,8 20,8" stroke="#fff" strokeWidth="2"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="#fff" strokeWidth="2"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="#fff" strokeWidth="2"/>
            <polyline points="10,9 9,9 8,9" stroke="#fff" strokeWidth="2"/>
          </svg>
        </div>
      );
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'approved' || status === 'analyzed') {
      return (
        <div style={{
          background: '#10B981',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Analyzed
        </div>
      );
    } else if (status === 'generated') {
      return (
        <div style={{
          background: '#8B5CF6',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
            <path d="M12 2v6M12 14v6M4.93 4.93l4.24 4.24M18.36 18.36l-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Generated
        </div>
      );
    } else if (status === 'pending' || status === 'processing') {
      return (
        <div style={{
          background: '#3B82F6',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="animate-spin">
            <path d="M21 12a9 9 0 11-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Processing
        </div>
      );
    } else {
      return (
        <div style={{
          background: '#6B7280',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          Uploaded
        </div>
      );
    }
  };

  // Handle document view
  const handleViewDocument = async (doc) => {
    const actionKey = `view_${doc.id}`;
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      let signedUrl;
      
      if (doc.type === 'kyc') {
        // Get signed URL for KYC documents
        const { data, error } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(doc.filePath, 3600); // 1 hour expiry
        
        if (error) throw error;
        signedUrl = data.signedUrl;
      } else if (doc.type === 'signed') {
        // Get signed URL for signed documents
        const { data, error } = await supabase.storage
          .from('kvk-forms')
          .createSignedUrl(doc.filePath, 3600); // 1 hour expiry
        
        if (error) throw error;
        signedUrl = data.signedUrl;
      } else {
        // Get signed URL for financial documents
        const { data, error } = await supabase.storage
          .from('financial-documents')
          .createSignedUrl(doc.filePath, 3600); // 1 hour expiry
        
        if (error) throw error;
        signedUrl = data.signedUrl;
      }

      // Open document in new tab
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Error viewing document. Please try again.');
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle document download
  const handleDownloadDocument = async (doc) => {
    const actionKey = `download_${doc.id}`;
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      let signedUrl;
      
      if (doc.type === 'kyc') {
        // Get signed URL for KYC documents
        const { data, error } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(doc.filePath, 3600); // 1 hour expiry
        
        if (error) throw error;
        signedUrl = data.signedUrl;
      } else if (doc.type === 'signed') {
        // Get signed URL for signed documents
        const { data, error } = await supabase.storage
          .from('kvk-forms')
          .createSignedUrl(doc.filePath, 3600); // 1 hour expiry
        
        if (error) throw error;
        signedUrl = data.signedUrl;
      } else {
        // Get signed URL for financial documents
        const { data, error } = await supabase.storage
          .from('financial-documents')
          .createSignedUrl(doc.filePath, 3600); // 1 hour expiry
        
        if (error) throw error;
        signedUrl = data.signedUrl;
      }

      // Open document in new window/tab
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Error opening document. Please try again.');
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleMouseEnter = (event, docType) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      content: docType.requiredDocs,
      position: { x: rect.left + rect.width / 2, y: rect.bottom + 10 }
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ show: false, content: [], position: { x: 0, y: 0 } });
  };

  const handleViewDetails = (doc) => {
    setSelectedDocumentData(doc);
    setDetailsModalOpen(true);
  };

  // Function to render extracted data in a structured format
  const renderExtractedData = (extractedData, documentType) => {
    if (!extractedData) return null;

    const renderField = (label, value, isStatus = false) => {
      if (!value) return null;
      
      let statusColor = '#fff';
      if (isStatus) {
        if (value.toLowerCase().includes('approved') || value.toLowerCase().includes('verified')) {
          statusColor = '#10B981';
        } else if (value.toLowerCase().includes('rejected')) {
          statusColor = '#EF4444';
        } else if (value.toLowerCase().includes('pending')) {
          statusColor = '#F59E0B';
        }
      }

      return (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            color: '#9CA3AF', 
            fontSize: '12px', 
            fontWeight: '500',
            display: 'block',
            marginBottom: '4px'
          }}>
            {label}
          </label>
          <div style={{ 
            color: statusColor, 
            fontSize: '14px',
            background: isStatus ? `${statusColor}15` : 'transparent',
            padding: isStatus ? '4px 8px' : '0',
            borderRadius: isStatus ? '4px' : '0',
            display: 'inline-block'
          }}>
            {value}
          </div>
        </div>
      );
    };

    // Render based on document type
    switch (documentType) {
      case 'passport':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {renderField('Full Name', `${extractedData.surname || ''} ${extractedData.given_names || ''}`.trim())}
            {renderField('Date of Birth', extractedData.date_of_birth)}
            {renderField('Nationality', extractedData.nationality)}
            {renderField('Passport Number', extractedData.passport_number)}
            {renderField('Date of Issue', extractedData.date_of_issue)}
            {renderField('Date of Expiry', extractedData.date_of_expiry)}
            {renderField('Issuing Authority', extractedData.issuing_authority)}
            {renderField('Verification Status', extractedData.verification_status || extractedData.validation_status, true)}
            {renderField('Validation Message', extractedData.validation_message)}
            {extractedData.verification_details && (
              <div style={{ gridColumn: '1 / -1', marginTop: '16px', padding: '12px', background: '#1a1b36', borderRadius: '6px' }}>
                <h4 style={{ color: '#D1D5DB', marginBottom: '8px', fontSize: '14px' }}>Verification Details</h4>
                {renderField('Status', extractedData.verification_details.status, true)}
                {renderField('Message', extractedData.verification_details.message)}
                {renderField('Verification Date', new Date(extractedData.verification_details.verification_date).toLocaleDateString())}
              </div>
            )}
          </div>
        );

      case 'addressProof':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {renderField('Full Address', extractedData.address)}
            {renderField('Document Date', extractedData.document_date)}
            {renderField('Issuing Authority', extractedData.issuing_authority)}
            {renderField('Resident Name', extractedData.resident_name || extractedData.name)}
            {renderField('Validation Status', extractedData.validation_status, true)}
            {renderField('Validation Message', extractedData.validation_message)}
            {renderField('Months Since Issue', extractedData.months_since_issue ? `${extractedData.months_since_issue} months` : null)}
            {extractedData.verification_details && (
              <div style={{ gridColumn: '1 / -1', marginTop: '16px', padding: '12px', background: '#1a1b36', borderRadius: '6px' }}>
                <h4 style={{ color: '#D1D5DB', marginBottom: '8px', fontSize: '14px' }}>Verification Details</h4>
                {renderField('Status', extractedData.verification_details.status, true)}
                {renderField('Message', extractedData.verification_details.message)}
                {renderField('Verification Date', new Date(extractedData.verification_details.verification_date).toLocaleDateString())}
              </div>
            )}
          </div>
        );

      case 'utilityBill':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {renderField('Service Provider', extractedData.service_provider)}
            {renderField('Bill Date', extractedData.bill_date)}
            {renderField('Total Amount Due', extractedData.total_amount_due)}
            {renderField('Service Address', extractedData.address)}
            {renderField('Account Number', extractedData.account_number)}
            {renderField('Verification Status', extractedData.verification_status, true)}
            {renderField('Validation Message', extractedData.validation_message)}
            {renderField('Months Since Issue', extractedData.months_since_issue ? `${extractedData.months_since_issue} months` : null)}
            {extractedData.verification_details && (
              <div style={{ gridColumn: '1 / -1', marginTop: '16px', padding: '12px', background: '#1a1b36', borderRadius: '6px' }}>
                <h4 style={{ color: '#D1D5DB', marginBottom: '8px', fontSize: '14px' }}>Verification Details</h4>
                {renderField('Status', extractedData.verification_details.status, true)}
                {renderField('Message', extractedData.verification_details.message)}
                {renderField('Verification Date', new Date(extractedData.verification_details.verification_date).toLocaleDateString())}
              </div>
            )}
          </div>
        );

      case 'drivingLicense':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {renderField('Full Name', extractedData.name)}
            {renderField('License Number', extractedData.license_number)}
            {renderField('Date of Birth', extractedData.date_of_birth)}
            {renderField('Issue Date', extractedData.date_of_issue)}
            {renderField('Expiry Date', extractedData.date_of_expiry)}
            {renderField('Address', extractedData.address)}
            {renderField('Verification Status', extractedData.verification_status, true)}
            {renderField('Validation Message', extractedData.validation_message)}
            {extractedData.verification_details && (
              <div style={{ gridColumn: '1 / -1', marginTop: '16px', padding: '12px', background: '#1a1b36', borderRadius: '6px' }}>
                <h4 style={{ color: '#D1D5DB', marginBottom: '8px', fontSize: '14px' }}>Verification Details</h4>
                {renderField('Status', extractedData.verification_details.status, true)}
                {renderField('Message', extractedData.verification_details.message)}
                {renderField('Verification Date', new Date(extractedData.verification_details.verification_date).toLocaleDateString())}
              </div>
            )}
          </div>
        );

      default:
        // For other document types, show a structured view of the data
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {Object.entries(extractedData).map(([key, value]) => {
              if (key === 'verification_details' || key === 'processing_metadata') return null;
              if (typeof value === 'object' && value !== null) return null;
              return renderField(
                key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                String(value),
                key.includes('status') || key.includes('verification')
              );
            })}
            {extractedData.verification_details && (
              <div style={{ gridColumn: '1 / -1', marginTop: '16px', padding: '12px', background: '#1a1b36', borderRadius: '6px' }}>
                <h4 style={{ color: '#D1D5DB', marginBottom: '8px', fontSize: '14px' }}>Verification Details</h4>
                {renderField('Status', extractedData.verification_details.status, true)}
                {renderField('Message', extractedData.verification_details.message)}
                {renderField('Verification Date', new Date(extractedData.verification_details.verification_date).toLocaleDateString())}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="dru-main-container">
      <div className="dru-upload-card">
        <div className="dru-doc-row" style={{ justifyContent: 'center', gap: '4rem' }}>
          {docTypes.map((doc) => (
            <div
              className="dru-doc-card"
              key={doc.title}
              style={{ 
                minWidth: 240, 
                maxWidth: 280, 
                cursor: (doc.type === 'kyc') ? 'pointer' : 'default', 
                boxShadow: '0 8px 32px rgba(255,77,128,0.10)',
                transition: 'all 0.3s ease'
              }}
              onClick={() => {
                if (doc.type === 'kyc') {
                  navigate('/documents/kyc');
                }
              }}
              onMouseEnter={(e) => {
                if (doc.type === 'kyc') {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 40px rgba(255,77,128,0.20)';
                }
                handleMouseEnter(e, doc);
              }}
              onMouseLeave={(e) => {
                if (doc.type === 'kyc') {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 32px rgba(255,77,128,0.10)';
                }
                handleMouseLeave();
              }}
            >
              <div className="dru-doc-card-icon">{doc.icon}</div>
              <div className="dru-doc-card-title">{doc.title}</div>
              <div className="dru-doc-card-count">{doc.count} documents</div>
            </div>
          ))}
        </div>

        {/* Upload Documents Header - Now positioned in the middle */}
        <div className="dru-upload-header" style={{ 
          marginTop: '32px', 
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            
            <div style={{ textAlign: 'center' }}>
              <div className="dru-upload-title">Upload Documents</div>
              <div className="dru-upload-subtitle">Upload documents to your data room for processing and analysis</div>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip.show && (
          <div 
            className="dru-tooltip"
            style={{
              position: 'fixed',
              left: tooltip.position.x,
              top: tooltip.position.y,
              transform: 'translateX(-50%)',
              zIndex: 1000
            }}
          >
            <div className="dru-tooltip-content">
              <div className="dru-tooltip-header">Required Documents:</div>
              <ul className="dru-tooltip-list">
                {tooltip.content.map((doc, index) => (
                  <li key={index} className="dru-tooltip-item">{doc}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="dru-upload-dashed-box" onClick={() => openModal('customKYB')} style={{ cursor: 'pointer' }}>
          <div className="dru-upload-dashed-content">
            <div className="dru-upload-dashed-icon">
              <svg width="40" height="40" fill="none" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#18143a"/><path d="M20 28V14M20 14l-5 5M20 14l5 5" stroke="#FF4D80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="dru-upload-dashed-title">Click Here</div>
            <div className="dru-upload-dashed-subtitle">Upload any document type without specific requirements. Supports PDF, DOCX, XLSX, JPG, PNG, and more.</div>
            <div className="dru-upload-dashed-action"> <span className="dru-upload-dashed-action-link">Click or drag files here to begin</span></div>
          </div>
        </div>
      </div>

      {/* Documents List Section - Now positioned below */}
      <div className="dru-documents-section">
        <div className="dru-documents-header">
          <div className="dru-documents-title">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" style={{ marginRight: '12px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#FF4D80" strokeWidth="2"/>
              <polyline points="14,2 14,8 20,8" stroke="#FF4D80" strokeWidth="2"/>
            </svg>
            Uploaded Documents
          </div>
          <div className="dru-documents-subtitle">Browse and search through your uploaded documents</div>
        </div>

        {/* Document Summary */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: '#232448',
            border: '1px solid #2e2f50',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#00D084'
            }}></div>
            <span style={{ color: '#D1D5DB', fontSize: '14px' }}>
              KYB: {documents.filter(doc => doc.type === 'kyc').length} documents
            </span>
          </div>
          <div style={{
            background: '#232448',
            border: '1px solid #2e2f50',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#3366FF'
            }}></div>
            <span style={{ color: '#D1D5DB', fontSize: '14px' }}>
              Financial: {documents.filter(doc => doc.type === 'financial').length} documents
            </span>
          </div>
          <div style={{
            background: '#232448',
            border: '1px solid #2e2f50',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#FF6B35'
            }}></div>
            <span style={{ color: '#D1D5DB', fontSize: '14px' }}>
              Signed: {documents.filter(doc => doc.type === 'signed').length} documents
            </span>
          </div>
          <div style={{
            background: '#232448',
            border: '1px solid #2e2f50',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#FF4D80'
            }}></div>
            <span style={{ color: '#D1D5DB', fontSize: '14px' }}>
              Total: {documents.length} documents
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="dru-filter-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '200px' }}>
              <label style={{ color: '#D1D5DB', fontSize: '14px' }}>Search:</label>
              <input
                type="text"
                placeholder="Search documents by name, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: '#232448',
                  color: '#fff',
                  border: '1px solid #2e2f50',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  flex: '1',
                  minWidth: '200px'
                }}
              />
            </div>

            {/* Document Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: '#D1D5DB', fontSize: '14px' }}>Document Type:</label>
              <select 
                value={documentTypeFilter} 
                onChange={(e) => setDocumentTypeFilter(e.target.value)}
                style={{
                  background: '#232448',
                  color: '#fff',
                  border: '1px solid #2e2f50',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  minWidth: '140px'
                }}
              >
                <option value="all">All Documents</option>
                <option value="kyc">KYB Documents</option>
                <option value="financial">Financial Documents</option>
                <option value="signed">Signed Documents</option>
              </select>
            </div>

            {/* Year Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: '#D1D5DB', fontSize: '14px' }}>Year:</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  background: '#232448',
                  color: '#fff',
                  border: '1px solid #2e2f50',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  minWidth: '120px'
                }}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year === 'all' ? 'All Years' : year}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {(documentTypeFilter !== 'all' || selectedYear !== 'all' || searchQuery.trim()) && (
              <button 
                onClick={() => {
                  setDocumentTypeFilter('all');
                  setSelectedYear('all');
                  setSearchQuery('');
                }}
                style={{
                  background: '#FF4D80',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#E61A4D'}
                onMouseOut={(e) => e.target.style.background = '#FF4D80'}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="dru-documents-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#D1D5DB' }}>
              <div className="animate-spin" style={{
                width: '32px',
                height: '32px',
                border: '3px solid #FF4D80',
                borderTop: '3px solid transparent',
                borderRadius: '50%',
                margin: '0 auto 16px auto',
                animation: 'spin 1s linear infinite'
              }}></div>
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#D1D5DB' }}>
              {searchQuery.trim() && documentTypeFilter !== 'all' && selectedYear !== 'all' ? (
                `No ${documentTypeFilter} documents found for "${searchQuery}" in ${selectedYear}.`
              ) : searchQuery.trim() && documentTypeFilter !== 'all' ? (
                `No ${documentTypeFilter} documents found for "${searchQuery}".`
              ) : searchQuery.trim() && selectedYear !== 'all' ? (
                `No documents found for "${searchQuery}" in ${selectedYear}.`
              ) : searchQuery.trim() ? (
                `No documents found for "${searchQuery}".`
              ) : documentTypeFilter !== 'all' && selectedYear !== 'all' ? (
                `No ${documentTypeFilter} documents found for ${selectedYear}.`
              ) : documentTypeFilter !== 'all' ? (
                `No ${documentTypeFilter} documents found.`
              ) : selectedYear !== 'all' ? (
                `No documents found for ${selectedYear}.`
              ) : (
                'No documents found.'
              )}
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div key={doc.id} className="dru-document-item">
                <div className="dru-document-icon">
                  {getDocumentIcon(doc.type, doc.category)}
                </div>
                <div className="dru-document-info">
                  <div className="dru-document-name">{doc.name}</div>
                  <div className="dru-document-meta">
                    {new Date(doc.uploadDate).toLocaleDateString()} • {formatFileSize(doc.fileSize)} • {doc.category}
                  </div>
                </div>
                <div className="dru-document-actions">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {getStatusBadge(doc.status)}
                    {doc.extractedData && (
                      <button 
                        onClick={() => handleViewDetails(doc)}
                        style={{
                          background: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        View Details
                      </button>
                    )}
                  </div>
                  <div className="dru-action-buttons">
                    <button 
                      className="dru-action-btn" 
                      title="View" 
                      onClick={() => handleViewDocument(doc)} 
                      disabled={loadingActions[`view_${doc.id}`]}
                    >
                      {loadingActions[`view_${doc.id}`] ? (
                        <div className="animate-spin" style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #FF4D80',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%'
                        }}></div>
                      ) : (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                    </button>
                    <button 
                      className="dru-action-btn" 
                      title="Download" 
                      onClick={() => handleDownloadDocument(doc)} 
                      disabled={loadingActions[`download_${doc.id}`]}
                    >
                      {loadingActions[`download_${doc.id}`] ? (
                        <div className="animate-spin" style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #FF4D80',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%'
                        }}></div>
                      ) : (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2"/>
                          <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
                          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                    </button>
                    <button className="dru-action-btn" title="More">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                        <circle cx="19" cy="12" r="1" fill="currentColor"/>
                        <circle cx="5" cy="12" r="1" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredDocuments.length > 0 && (
          <div className="dru-view-all-section">
            <button className="dru-view-all-btn">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2"/>
              </svg>
              View All ({documents.length})
            </button>
          </div>
        )}
      </div>

      <DocumentUploadModal
        open={modalOpen}
        onClose={closeModal}
        selectedType={selectedType}
        selectedFinancialCategory={selectedFinancialCategory}
        setSelectedFinancialCategory={setSelectedFinancialCategory}
        financialCategories={financialCategories}
        onDocumentUploaded={fetchDocuments}
      />

      {/* Details Modal */}
      {detailsModalOpen && selectedDocumentData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1b36',
            border: '1px solid #2e2f50',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #2e2f50',
              paddingBottom: '16px'
            }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
                Document Details - {selectedDocumentData.name}
              </h2>
              <button 
                onClick={() => setDetailsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#D1D5DB', marginBottom: '12px', fontSize: '16px' }}>Document Information</h3>
              <div style={{
                background: '#232448',
                border: '1px solid #2e2f50',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ color: '#9CA3AF', fontSize: '12px' }}>File Name</label>
                    <div style={{ color: '#fff', fontSize: '14px' }}>{selectedDocumentData.name}</div>
                  </div>
                  <div>
                    <label style={{ color: '#9CA3AF', fontSize: '12px' }}>Document Type</label>
                    <div style={{ color: '#fff', fontSize: '14px' }}>{selectedDocumentData.category}</div>
                  </div>
                  <div>
                    <label style={{ color: '#9CA3AF', fontSize: '12px' }}>Upload Date</label>
                    <div style={{ color: '#fff', fontSize: '14px' }}>
                      {new Date(selectedDocumentData.uploadDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#9CA3AF', fontSize: '12px' }}>File Size</label>
                    <div style={{ color: '#fff', fontSize: '14px' }}>{formatFileSize(selectedDocumentData.fileSize)}</div>
                  </div>
                  <div>
                    <label style={{ color: '#9CA3AF', fontSize: '12px' }}>Status</label>
                    <div style={{ color: '#fff', fontSize: '14px' }}>{selectedDocumentData.status}</div>
                  </div>
                  {selectedDocumentData.representativeId && (
                    <div>
                      <label style={{ color: '#9CA3AF', fontSize: '12px' }}>Representative</label>
                      <div style={{ color: '#fff', fontSize: '14px' }}>{selectedDocumentData.representativeId}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedDocumentData.extractedData && (
              <div>
                <h3 style={{ color: '#D1D5DB', marginBottom: '12px', fontSize: '16px' }}>Extracted Data</h3>
                <div style={{
                  background: '#232448',
                  border: '1px solid #2e2f50',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  {renderExtractedData(selectedDocumentData.extractedData, selectedDocumentData.category)}
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              borderTop: '1px solid #2e2f50',
              paddingTop: '16px'
            }}>
              <button 
                onClick={() => setDetailsModalOpen(false)}
                style={{
                  background: '#6B7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dataroom; 