import React, { useState, useRef, useEffect } from 'react';
import { 
  FaFileAlt, 
  FaCheckCircle, 
  FaFileSignature, 
  FaArrowRight, 
  FaEye, 
  FaFileUpload, 
  FaSpinner, 
  FaFilePdf, 
  FaDownload, 
  FaTrash,
  FaCloudUploadAlt,
  FaFileContract,
  FaChartLine,
  FaCalculator,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaBalanceScale,
  FaSearchDollar,
  FaCloudDownloadAlt,
  FaEyeSlash,
  FaTrashAlt,
  FaFileExcel,
  FaFileCsv
} from 'react-icons/fa';
import { 
  HiDocumentText, 
  HiEye, 
  HiDownload, 
  HiTrash, 
  HiCloudUpload,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineDownload,
  HiOutlineTrash,
  HiOutlineCloudUpload
} from 'react-icons/hi';
import { 
  MdVisibility, 
  MdFileDownload, 
  MdDelete, 
  MdCloudUpload,
  MdDescription,
  MdAccountBalance,
  MdTrendingUp,
  MdAssessment,
  MdFilePresent
} from 'react-icons/md';
import { 
  BiDownload, 
  BiShow, 
  BiTrash, 
  BiUpload,
  BiFile,
  BiFileBlank,
  BiChart,
  BiMoney
} from 'react-icons/bi';
import { 
  IoEyeOutline, 
  IoDownloadOutline, 
  IoTrashOutline, 
  IoCloudUploadOutline,
  IoDocumentTextOutline,
  IoStatsChartOutline
} from 'react-icons/io5';
import './CorporateIncomeTax.css';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf'; 
import { supabase } from './SupabaseClient';
import { corporateTaxDataManager } from './CorporateTaxDataManager';

const requiredDocuments = [
  {
    icon: <MdAssessment style={{ fontSize: '1.5rem', color: '#4f46e5' }} />,
    title: 'Financial Statement',
    description: 'Profit & Loss, Balance Sheet for current year'
  },
  {
    icon: <FaBalanceScale style={{ fontSize: '1.5rem', color: '#10b981' }} />,
    title: 'Trial Balance',
    description: 'Detailed account balances'
  },
  {
    icon: <FaFileAlt style={{ fontSize: '1.5rem', color: '#ef4444' }} />,
    title: 'Balance Sheet',
    description: 'Assets, liabilities and equity statement'
  },
  {
    icon: <FaChartLine style={{ fontSize: '1.5rem', color: '#f59e0b' }} />,
    title: 'Profit and Loss Statement',
    description: 'Revenue, expenses and net income analysis'
  },
  {
    icon: <FaMoneyBillWave style={{ fontSize: '1.5rem', color: '#f97316' }} />,
    title: 'Cashflow Statement',
    description: 'Cash inflows and outflows analysis'
  }
];  

const steps = [
    { number: '1', label: 'Required Docs' },
    { number: '2', label: 'Upload Documents' },
    { number: '3', label: 'Processing' },
    { number: '4', label: 'CIT Report' },
];

export default function CorporateIncomeTax() {
  const [step, setStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [existingAnalysis, setExistingAnalysis] = useState(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [showFileSelection, setShowFileSelection] = useState(false);
  const [isLoadingDataroomFiles, setIsLoadingDataroomFiles] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [processingStartTime, setProcessingStartTime] = useState(null);
  const [selectedYear, setSelectedYear] = useState('2024'); // Default to current year
  const [selectedDocumentType, setSelectedDocumentType] = useState('all'); // Document type filter
  const navigate = useNavigate();
  const fileInputRef = useRef();

  // Handle document card clicks for navigation
  const handleDocumentClick = (documentTitle) => {
    try {
      switch (documentTitle) {
        case 'Financial Statement':
          navigate('/financial-hub');
          break;
        case 'Trial Balance':
        case 'Balance Sheet':
        case 'Cashflow Statement':
        case 'Profit and Loss Statement':
          // These documents don't redirect anywhere - just show info
          console.log(`Document clicked: ${documentTitle}`);
          break;
        default:
          console.log(`Navigation not implemented for: ${documentTitle}`);
          navigate('/financial-hub');
          break;
      }
    } catch (error) {
      console.error('Navigation error:', error);
      navigate('/financial-hub');
    }
  };

  // Handle progress step clicks
  const handleStepClick = async (stepIndex) => {
    try {
      if (stepIndex <= step) {
        // Allow going back to previous steps
        setStep(stepIndex);
        
        // Update session progress (optional)
        if (currentSessionId) {
          try {
            await corporateTaxDataManager.updateSessionProgress(stepIndex, {
              step_changed: new Date().toISOString(),
              direction: 'backward'
            });
          } catch (error) {
            console.warn('Could not update session progress (tables may not exist):', error.message);
          }
        }
      } else if (stepIndex === step + 1) {
        // Allow going to next step if current step is completed
        if (stepIndex === 1 && step === 0) {
          setStep(1);
          
          // Update session progress (optional)
          if (currentSessionId) {
            try {
              await corporateTaxDataManager.updateSessionProgress(1, {
                step_changed: new Date().toISOString(),
                direction: 'forward'
              });
            } catch (error) {
              console.warn('Could not update session progress (tables may not exist):', error.message);
            }
          }
        } else if (stepIndex === 2 && uploadedFiles.length > 0) {
          processDocuments();
        }
      }
    } catch (error) {
      console.error('Step click error:', error);
      
      // Log error to session if available (optional)
      if (currentSessionId) {
        try {
          await corporateTaxDataManager.logSessionError('Step navigation error', {
            error: error.message,
            stepIndex,
            currentStep: step
          });
        } catch (logError) {
          console.warn('Could not log session error (tables may not exist):', logError.message);
        }
      }
    }
  };

  // Check for existing analysis on component mount
  useEffect(() => {
    checkUserAuthentication();
  }, []);

  // Clear uploaded files and messages when year changes
  useEffect(() => {
    // Only clear if there are uploaded files from data room
    const dataRoomFiles = uploadedFiles.filter(file => file.source === 'dataroom');
    if (dataRoomFiles.length > 0) {
      setUploadedFiles(prev => prev.filter(file => file.source !== 'dataroom'));
      setUploadSuccess('');
      setUploadError('');
    }
  }, [selectedYear]);



  const checkUserAuthentication = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      setUserId(session.user.id);
      setUserEmail(session.user.email);
      
      // Initialize session with data manager (optional - skip if tables don't exist)
      try {
        const sessionResult = await corporateTaxDataManager.initializeSession(session.user.id);
        setCurrentSessionId(sessionResult.sessionId);
        console.log('Session initialized:', sessionResult.sessionId);
      } catch (sessionError) {
        console.warn('Could not initialize session (database tables may not exist):', sessionError.message);
        // Continue without session for backward compatibility - this is fine
      }
      
      // Check if user has existing analysis (also make this optional)
      try {
        await checkExistingAnalysis(session.user.id);
      } catch (analysisError) {
        console.warn('Could not check existing analysis:', analysisError.message);
        // Continue without existing analysis check - start fresh
      }
      
    } catch (error) {
      console.error('Error checking authentication:', error);
      navigate('/login');
    }
  };

  const checkExistingAnalysis = async (currentUserId) => {
    try {
      setIsCheckingExisting(true);
      
      // Check if user has existing corporate tax analysis
      const { data, error } = await supabase
        .from('corporate_tax_analysis')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('Could not check existing analysis:', error.message);
        // If table doesn't exist, that's fine - user will start fresh
        if (error.code === '42P01') {
          console.info('Corporate tax analysis table does not exist yet. User will start with fresh analysis.');
        }
        // Don't throw error - just continue without existing analysis
        return;
      } 
      
      if (data && data.length > 0) {
        // User has existing analysis
        setExistingAnalysis(data[0]);
        setStep(4); // Go to existing analysis view
      }
    } catch (error) {
      console.warn('Error in checkExistingAnalysis:', error.message);
      // Don't throw error - just continue
    } finally {
      setIsCheckingExisting(false);
    }
  };

  const createCorporateTaxTable = async () => {
    try {
      // Create the corporate_tax_analysis table
      const { error } = await supabase.rpc('create_corporate_tax_table');
      
      if (error) {
        console.error('Error creating table:', error);
        // If RPC doesn't exist, we'll handle this in the backend or manually
      }
    } catch (error) {
      console.error('Error creating corporate tax table:', error);
    }
  };

  const saveCorporateTaxAnalysis = async (analysisData) => {
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Calculate processing time
      const processingTimeSeconds = processingStartTime ? 
        Math.round((Date.now() - processingStartTime) / 1000) : 0;

      // Try to use data manager first (comprehensive tracking)
      try {
        const savedAnalysis = await corporateTaxDataManager.saveCorporateTaxAnalysis(
          analysisData, 
          processingTimeSeconds
        );
        console.log('Analysis saved successfully via data manager:', savedAnalysis);
        return savedAnalysis;
      } catch (dataManagerError) {
        console.warn('Data manager save failed (tables may not exist):', dataManagerError.message);
        
        // Fallback to basic save method (original implementation)
        const reportData = formatReportData(analysisData);
        
        const dbData = {
          user_id: userId,
          company_name: reportData.companyName,
          fiscal_year: reportData.fiscalYear,
          revenue: reportData.revenue,
          expenses: reportData.expenses,
          depreciation: reportData.depreciation,
          deductions: reportData.deductions,
          taxable_income: reportData.taxableIncome,
          tax_rate: reportData.taxRate,
          final_tax_owed: reportData.finalTaxOwed,
          documents: JSON.stringify(reportData.documents),
          observations: JSON.stringify(reportData.observations),
          recommendations: JSON.stringify(reportData.recommendations),
          raw_analysis_data: JSON.stringify(analysisData),
          status: 'completed',
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('corporate_tax_analysis')
          .insert([dbData])
          .select();

        if (error) {
          console.warn('Fallback save also failed:', error.message);
          // Even if save fails, don't prevent user from seeing results
          console.info('Analysis completed but not saved to database. Results will be shown to user.');
          return null;
        }

        console.log('Analysis saved successfully via fallback method:', data);
        return data[0];
      }
      
    } catch (error) {
      console.error('Error in saveCorporateTaxAnalysis:', error);
      
      // Log error to session if available (optional)
      if (currentSessionId) {
        try {
          await corporateTaxDataManager.logSessionError('Failed to save analysis', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          });
        } catch (logError) {
          console.warn('Could not log session error:', logError.message);
        }
      }
      
      // Don't throw error - let user see results even if save fails
      console.info('Analysis completed but save failed. Results will be shown to user.');
      return null;
    }
  };

  const startNewAnalysis = () => {
    setExistingAnalysis(null);
    setStep(0); // Start from step 0 (Required Documents) to show requirements first
    setProcessedResult(null);
    setUploadedFiles([]);
    setUploadError('');
    setUploadSuccess('');
  };

  const viewSavedAnalysis = async () => {
    try {
      if (!userId) {
        setUploadError('User not authenticated');
        return;
      }

      // Always fetch fresh data from database
      const { data, error } = await supabase
        .from('corporate_tax_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Database error:', error);
        setUploadError('Database error. Please try again.');
        return;
      }

      if (data && data.length > 0) {
        console.log('Found analysis in database:', data[0]);
        setExistingAnalysis(data[0]);
        
        // Clear any existing processed result to ensure we show the saved analysis
        setProcessedResult(null);
        
        // Go directly to step 4 where the existing analysis will be displayed
        setStep(4);
        
        // Clear any upload errors
        setUploadError('');
      } else {
        setUploadError('No saved analysis found. Please process documents first.');
      }
    } catch (error) {
      console.error('Error loading saved analysis:', error);
      setUploadError('Unable to load saved analysis. Please try again.');
    }
  };

  const deleteExistingAnalysis = async () => {
    try {
      if (!existingAnalysis) return;

      // Check if this is sample data (string ID) or real database data (numeric ID)
      if (typeof existingAnalysis.id === 'string' && existingAnalysis.id.startsWith('sample-')) {
        // This is sample data, just reset the state without database deletion
        console.log('Deleting sample analysis data');
        startNewAnalysis();
        return;
      }

      // This is real database data, delete from database
      const { error } = await supabase
        .from('corporate_tax_analysis')
        .delete()
        .eq('id', existingAnalysis.id);

      if (error) {
        console.error('Error deleting analysis:', error);
        throw error;
      }

      // Reset to start new analysis
      startNewAnalysis();
    } catch (error) {
      console.error('Error deleting existing analysis:', error);
      alert('Error deleting existing analysis. Please try again.');
    }
  };



  const handleFileUpload = async (event) => {
    console.log('File upload triggered');
    const files = Array.from(event.target.files);
    console.log('Files selected:', files.length);
    if (files.length === 0) return;

    // Validate files
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File size exceeds 10MB limit`);
        return;
      }

      // Check file type
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];

      if (!validTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(pdf|xlsx|xls|csv)$/)) {
        errors.push(`${file.name}: Invalid file type. Please upload PDF, Excel, or CSV files only`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
      return;
        }

    const newFiles = [];
    
    // Process each file and save to database
    for (let file of validFiles) {
      try {
        const fileId = Date.now() + Math.random();
        
        // Create file object for upload list with auto-assigned document type
        const fileObj = {
          id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      uploadedAt: new Date().toLocaleString(),
      documentType: 'financial_statement' // Auto-assign default document type
        };

        // Save file metadata to database via data manager (optional)
        if (currentSessionId) {
          try {
            const filePath = `${userId}/${currentSessionId}/${file.name}`;
            await corporateTaxDataManager.saveUploadedDocument(
              file,
              'unspecified', // Will be updated when user selects document type
              filePath
            );
            fileObj.databaseId = fileId; // Track database ID
            console.log(`File ${file.name} saved to database`);
          } catch (dbError) {
            console.warn(`Could not save ${file.name} to database (tables may not exist):`, dbError.message);
            // Continue without database save - this is fine
          }
        }

        newFiles.push(fileObj);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        continue;
      }
    }

    setUploadedFiles(prev => {
      const updatedFiles = [...prev, ...newFiles];
      console.log('Updated uploaded files:', updatedFiles.length);
      return updatedFiles;
    });
    setUploadSuccess(`${validFiles.length} file(s) uploaded successfully`);
    setUploadError('');

    // Update session progress (optional)
    if (currentSessionId && newFiles.length > 0) {
      try {
        await corporateTaxDataManager.updateSessionProgress(1, {
          files_uploaded: newFiles.length,
          upload_timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Could not update session progress (tables may not exist):', error.message);
        // Continue without session tracking - this is fine
      }
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };



  const handleViewFile = async (file) => {
    try {
      if (file.isStorageReference && file.file_path) {
        // Handle imported documents from Financial Hub
        console.log('Viewing imported document from storage:', file);
        
        let filePath = file.file_path;
        let bucket = file.storage_bucket || 'reports';
        
        // Remove any leading slashes to prevent double slashes in the path
        filePath = filePath.replace(/^\/+/, '');
        
        console.log('Attempting to view file from storage:', { bucket, filePath });

        const { data: signedUrlData, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) {
          console.error('Error creating signed URL:', error);
          throw error;
        }

        if (!signedUrlData?.signedUrl) {
          throw new Error('No signed URL received');
        }

        console.log('Successfully generated signed URL for imported document');
        window.open(signedUrlData.signedUrl, '_blank');
      } else if (file.file) {
        // Handle local uploaded files
    const url = URL.createObjectURL(file.file);
    window.open(url, '_blank');
      } else {
        throw new Error('No file data available for viewing');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      alert(`Unable to view file: ${error.message || 'Please try again later.'}`);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      if (file.isStorageReference && file.file_path) {
        // Handle imported documents from Financial Hub
        console.log('Downloading imported document from storage:', file);
        
        let filePath = file.file_path;
        let bucket = file.storage_bucket || 'reports';
        
        // Remove any leading slashes to prevent double slashes in the path
        filePath = filePath.replace(/^\/+/, '');
        
        console.log('Attempting to download file from storage:', { bucket, filePath });

        // First try to get a download URL
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(filePath);

        if (downloadError) {
          console.error('Error downloading file from storage:', downloadError);
          throw downloadError;
        }

        if (!downloadData) {
          throw new Error('No file data received from storage');
        }

        // Create a blob URL and trigger download
        const blob = new Blob([downloadData], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name || 'document';
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        
        console.log('File download from storage initiated successfully');
      } else if (file.file) {
        // Handle local uploaded files
    const url = URL.createObjectURL(file.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
      } else {
        throw new Error('No file data available for download');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert(`Unable to download file: ${error.message || 'Please try again later.'}`);
    }
  };

  

  // Load documents from Financial Hub based on selected type
  const fetchAndLoadFinancialDocuments = async () => {
    console.log(`🔄 Loading ${selectedDocumentType === 'all' ? 'all documents' : selectedDocumentType} from Financial Hub for ${selectedYear}...`);
    
    if (!userId) {
      setUploadError('User not authenticated');
      return;
    }

    setIsLoadingDataroomFiles(true);
    setUploadError('');
    
          try {
        // Fetch financial documents from Financial Hub (table_reports)
        const yearToFilter = parseInt(selectedYear);
        
        const { data: financialData, error: financialError } = await supabase
          .from('table_reports')
          .select('*')
          .eq('user_id', userId)
          .eq('year', yearToFilter)
          .order('created_at', { ascending: false });

              if (financialError) {
          setUploadError(`Error fetching financial documents: ${financialError.message}`);
          return;
        }

        if (!financialData || financialData.length === 0) {
          setUploadError(`No financial documents found for ${selectedYear} in your Financial Hub.`);
          return;
        }

                console.log(`✅ Found ${financialData.length} financial documents in Financial Hub`);

        // Filter by document type if not "all"
        let filteredData = financialData;
        if (selectedDocumentType !== 'all') {
          filteredData = financialData.filter(doc => doc.doc_type === selectedDocumentType);
          console.log(`📋 Filtered to ${filteredData.length} documents of type: ${selectedDocumentType}`);
        }

      // Create file objects directly from Financial Hub data with proper storage references
        const loadedFiles = [];
        
        for (const doc of filteredData) {
          const fileName = doc.file_name || `${doc.doc_type}_${doc.year}.pdf`;
          
          // Check if already loaded
          const isAlreadyUploaded = uploadedFiles.some(file => file.name === fileName);
          if (isAlreadyUploaded) {
            console.log(`Skipping ${fileName} - already uploaded`);
            continue;
          }
          
        // Create a file object that maintains the original storage reference
          const newFile = {
            id: Date.now() + Math.random(),
            name: fileName,
          size: doc.file_size || 0,
            type: 'application/pdf',
          file: null, // No actual file object since we're referencing storage
          uploadedAt: new Date(doc.created_at).toLocaleString(),
          documentType: doc.doc_type,
            source: 'financial_hub',
          originalData: doc, // Store original Financial Hub data
          // Storage information for view/download
          file_path: doc.file_path,
          storage_bucket: doc.storage_bucket || 'reports',
          isStorageReference: true // Flag to indicate this is a storage reference
          };
          
          loadedFiles.push(newFile);
        console.log(`✅ Loaded ${fileName} (${doc.doc_type}) with storage reference`);
        }

              if (loadedFiles.length > 0) {
          setUploadedFiles(prev => [...prev, ...loadedFiles]);
          const typeText = selectedDocumentType === 'all' ? 'documents' : `${selectedDocumentType} documents`;
          setUploadSuccess(`Successfully loaded ${loadedFiles.length} ${typeText} from ${selectedYear} Financial Hub`);
          alert(`🎉 Success! Loaded ${loadedFiles.length} ${typeText} from ${selectedYear} Financial Hub:\n${loadedFiles.map(f => `• ${f.name} (${f.documentType})`).join('\n')}`);
        } else {
          const typeText = selectedDocumentType === 'all' ? 'documents' : selectedDocumentType;
          setUploadError(`No ${typeText} found in Financial Hub for ${selectedYear}.`);
        }

          } catch (error) {
        console.error('Error loading Financial Hub documents:', error);
        setUploadError(`Error: ${error.message}`);
      } finally {
        setIsLoadingDataroomFiles(false);
      }
    };



  const processDocuments = async () => {
    if (uploadedFiles.length === 0) {
      setUploadError('Please upload at least one document before proceeding');
      return;
    }

    // Auto-assign generic document type for processing if not set
    uploadedFiles.forEach(file => {
      if (!file.documentType) {
        file.documentType = 'financial_statement'; // Default document type
      }
    });

    setIsProcessing(true);
    setUploadError('');
    setUploadSuccess('');
    
    // Track processing start time
    const startTime = Date.now();
    setProcessingStartTime(startTime);

    // Update session progress (optional)
    if (currentSessionId) {
      try {
        await corporateTaxDataManager.updateSessionProgress(2, {
          processing_started: new Date().toISOString(),
          total_files: uploadedFiles.length,
          files_by_type: uploadedFiles.reduce((acc, file) => {
            acc[file.documentType] = (acc[file.documentType] || 0) + 1;
            return acc;
          }, {})
        });
      } catch (error) {
        console.warn('Could not update session progress (tables may not exist):', error.message);
        // Continue without session tracking - this is fine
      }
    }

    try {
      const formData = new FormData();
      
      // Add files to FormData
      uploadedFiles.forEach((fileObj, index) => {
        formData.append('documents', fileObj.file);
        formData.append(`documentTypes[${index}]`, fileObj.documentType);
      });

      console.log('Sending files to backend:', uploadedFiles.map(f => `${f.name} (${f.documentType})`));

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

      // Try multiple approaches to bypass CORS and server issues
      let response;
      let attempt = 0;
      const maxAttempts = 3;
      
      const endpoints = [
        'https://corporate-tax-analyser.onrender.com/analyze-intelligent',
        'https://cors-anywhere.herokuapp.com/https://corporate-tax-analyser.onrender.com/analyze-intelligent',
        'https://api.allorigins.win/raw?url=https://corporate-tax-analyser.onrender.com/analyze-intelligent'
      ];
      
      while (attempt < maxAttempts) {
        try {
          attempt++;
          const currentEndpoint = endpoints[attempt - 1] || endpoints[0];
          
          if (currentEndpoint.includes('cors-anywhere') || currentEndpoint.includes('allorigins')) {
            // For proxy endpoints, we need to handle differently
            const proxyUrl = currentEndpoint.includes('cors-anywhere') 
              ? 'https://cors-anywhere.herokuapp.com/https://corporate-tax-analyser.onrender.com/analyze-intelligent'
              : 'https://api.allorigins.win/raw?url=https://corporate-tax-analyser.onrender.com/analyze-intelligent';
              
            response = await fetch(proxyUrl, {
              method: 'POST',
              body: formData,
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
                'Origin': 'http://localhost:3000',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });
          } else {
            // Direct API call
            response = await fetch(currentEndpoint, {
        method: 'POST',
        body: formData,
        mode: 'cors',
              signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
              credentials: 'omit',
            });
          }
          
          // If we get here, the request succeeded
          break;
        } catch (fetchError) {
          if (attempt >= maxAttempts) {
            throw fetchError;
          }
          
          // Wait before retry with increasing delay
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }

            clearTimeout(timeoutId);
      
      // Response received successfully
      
      // Check for invalid response (HTTP 0 indicates CORS blocking)
      if (response.status === 0) {
        throw new Error('CORS Error: Request was blocked by browser security policy. The server is not sending proper CORS headers.');
      }
      
      // If all attempts failed, provide a fallback response
      if (!response || response.status >= 400) {
        // Don't show fake data - show error instead
        setUploadError('Unable to connect to the analysis server. Please check your internet connection and try again.');
        setStep(2);
        return;
      }

      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 500) {
        const errorText = await response.text();
          
          // Try to parse as JSON, fallback to text
          let errorMessage = 'Server error occurred';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorJson.message || errorText;
          } catch (e) {
            errorMessage = errorText || 'Internal server error';
          }
          
          setProcessedResult({
            type: 'error',
            data: { detail: errorMessage },
            status: response.status
          });
          setStep(2);
          setUploadSuccess('Response received from server');
        return;
        } else if (response.status === 429) {
          setUploadError('Server is busy. Please wait a moment and try again.');
        } else if (response.status === 413) {
          setUploadError('Files are too large. Please reduce file size and try again.');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      // Try to get the response as JSON
      const result = await response.json();
      
      console.log('🎯 API Response received:', result);
      console.log('📊 Response structure:', {
        hasGeneralInfo: !!result.general_information,
        hasTaxReturnSummary: !!result.tax_return_summary,
        hasBreakdown: !!result.tax_return_summary?.breakdown,
        hasFileMetadata: !!result.file_metadata,
        hasAuditFlags: !!result.audit_flags
      });
      console.log('🔍 Full response keys:', Object.keys(result));
      console.log('🔍 Breakdown keys:', Object.keys(result.tax_return_summary?.breakdown || {}));
      console.log('💰 Sample values:', {
        revenue: result.tax_return_summary?.breakdown?.Revenue,
        expenses: result.tax_return_summary?.breakdown?.Expenses,
        taxableIncome: result.tax_return_summary?.breakdown?.['Taxable Income']
      });

      // Store the result to display in the UI
      setProcessedResult({
        type: 'summary',
        data: result,
        status: response.status
      });

      setStep(4); // Go to step 4 where the actual financial report is displayed
      setUploadSuccess('Analysis completed! Report is ready.');
      
    } catch (error) {
      console.error('Error processing documents:', error);
      
      // Clean, user-friendly error handling
      if (error.name === 'AbortError') {
        setUploadError('Request timeout: The server took too long to respond. Please try again.');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        if (error.message.includes('CORS') || error.message.includes('blocked by CORS policy')) {
          setUploadError('Connection blocked by security policy. Please try again later or contact support if the issue persists.');
      } else {
          setUploadError('Unable to connect to the server. Please check your internet connection and try again.');
        }
      } else if (error.message.includes('CORS')) {
        setUploadError('Connection blocked by security policy. Please try again later.');
      } else {
        setUploadError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = async () => {
    try {
      // Save the analysis to database before completing
      if (processedResult && processedResult.data) {
        await saveCorporateTaxAnalysis(processedResult.data);
      }
      setStep(3);
    } catch (error) {
      console.error('Error saving analysis:', error);
      // Still proceed to next step even if save fails
      setStep(3);
    }
  };



  const formatCurrency = (amount) => {
    if (typeof amount === 'number') {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
    return '€0.00';
  };

  const validateExtractedData = (data) => {
    const issues = [];
    
    if (data.revenue === 0 && data.expenses === 0) {
      issues.push('Both revenue and expenses are zero - this might indicate data extraction issues');
    }
    
    if (data.revenue < 0) {
      issues.push('Revenue is negative - this might be an extraction error');
    }
    
    if (data.expenses < 0) {
      issues.push('Expenses are negative - this might be an extraction error');
    }
    
    if (data.taxableIncome !== (data.revenue - data.expenses - data.depreciation - data.deductions)) {
      issues.push('Taxable income calculation doesn\'t match expected formula');
    }
    
    if (data.documents.length === 0) {
      issues.push('No document details found in the response');
    }
    
    if (issues.length > 0) {
      console.warn('Data validation issues:', issues);
    }
    
    return issues;
  };

  const formatReportData = (data) => {
    console.log('🔍 Raw data received in formatReportData:', data);
    console.log('🔍 Data type:', typeof data);
    console.log('🔍 Data keys:', Object.keys(data || {}));
    
    // Simple direct extraction from backend API response
    const generalInfo = data.general_information || {};
    const companyName = generalInfo.company_name || 'Unknown Company';
    const fiscalYear = generalInfo.fiscal_year || new Date().getFullYear();
    
    console.log('📋 General Info:', generalInfo);
    console.log('📋 Company Name:', companyName);
    console.log('📋 Fiscal Year:', fiscalYear);
    
    // Extract financial data directly from breakdown
    const breakdown = data.tax_return_summary?.breakdown || {};
    console.log('💰 Breakdown data:', breakdown);
    console.log('💰 Breakdown keys:', Object.keys(breakdown));
    
    // Just get the raw values as they come from backend
    const revenue = breakdown.Revenue || 0;
    const expenses = breakdown.Expenses || 0;
    const depreciation = breakdown.Depreciation || 0;
    const deductions = breakdown.Deductions || 0;
    const taxableIncome = breakdown['Taxable Income'] || 0;
    const taxRate = breakdown['Applied Tax Rate'] || '0%';
    const finalTaxOwed = breakdown['Final Tax Owed'] || 0;
    
    console.log('💵 Extracted values:', {
      revenue, expenses, depreciation, deductions, taxableIncome, taxRate, finalTaxOwed
    });
    
    // Extract documents
    const documents = (data.file_metadata || []).map(file => ({
      filename: file.filename,
      type: file.type,
      company_detected: file.company_name_detected,
      fiscal_year: file.fiscal_year_detected
    }));
    
    // Extract observations
    const observations = data.audit_flags || [];
    
    // Simple recommendations
    const recommendations = [
      'Review the generated report for accuracy',
      'Validate supporting documents',
      'Consult with tax professional if needed'
    ];
    
    const extractedData = {
      companyName,
      fiscalYear,
      revenue,
      expenses,
      depreciation,
      deductions,
      taxableIncome,
      taxRate,
      finalTaxOwed,
      documents,
      observations,
      recommendations
    };
    
    console.log('✅ Final extracted data:', extractedData);
    return extractedData;
  };

  const generatePDFReport = async (data) => {
    console.log('PDF Function - Data received:', data);
    console.log('PDF Function - Data structure:', {
      hasGeneralInfo: !!data?.general_information,
      hasTaxSummary: !!data?.tax_return_summary,
      hasBreakdown: !!data?.tax_return_summary?.breakdown,
      companyName: data?.general_information?.company_name,
      fiscalYear: data?.general_information?.fiscal_year,
      revenue: data?.tax_return_summary?.breakdown?.Revenue,
      expenses: data?.tax_return_summary?.breakdown?.Expenses
    });
    
    const doc = new jsPDF();
    
    // Set up document
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Corporate Income Tax Analysis Report', 20, 30);
    
    let yPosition = 50;
    
    // Company & Fiscal Information
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Company & Fiscal Information', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Extract company info from the correct structure (database format)
    const companyName = data?.company_name || data?.general_information?.company_name || 'N/A';
    const fiscalYear = data?.fiscal_year || data?.general_information?.fiscal_year || 'N/A';
    
    doc.text(`Company Name: ${companyName}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Fiscal Year: ${fiscalYear}`, 20, yPosition);
    yPosition += 15;
    
    // Financial Breakdown
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Financial Breakdown', 20, yPosition);
    yPosition += 10;
    
    // Extract financial data from database structure (top level)
    const revenue = data?.revenue || data?.tax_return_summary?.breakdown?.Revenue || 0;
    const expenses = data?.expenses || data?.tax_return_summary?.breakdown?.Expenses || 0;
    const depreciation = data?.depreciation || data?.tax_return_summary?.breakdown?.Depreciation || 0;
    const deductions = data?.deductions || data?.tax_return_summary?.breakdown?.Deductions || 0;
    const taxableIncome = data?.taxable_income || data?.tax_return_summary?.breakdown?.['Taxable Income'] || 0;
    const appliedTaxRate = data?.applied_tax_rate || data?.tax_return_summary?.breakdown?.['Applied Tax Rate'] || '0%';
    const finalTaxOwed = data?.final_tax_owed || data?.tax_return_summary?.breakdown?.['Final Tax Owed'] || 0;
    
    // Create table-like structure for financial data with proper spacing
    const financialData = [
      ['Revenue', revenue ? `€${Number(revenue).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '€0.00'],
      ['Expenses', expenses ? `€${Number(expenses).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '€0.00'],
      ['Depreciation', depreciation ? `€${Number(depreciation).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '€0.00'],
      ['Deductions', deductions ? `€${Number(deductions).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '€0.00'],
      ['Taxable Income', taxableIncome ? `€${Number(taxableIncome).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '€0.00'],
      ['Applied Tax Rate', appliedTaxRate],
      ['Final Tax Owed', finalTaxOwed ? `€${Number(finalTaxOwed).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '€0.00']
    ];
    
    // Calculate column widths for better alignment
    const labelWidth = 100;
    const valueWidth = 60;
    const startX = 20;
    const valueX = startX + labelWidth;
    
    doc.setFontSize(12);
    financialData.forEach(([label, value], index) => {
      // Draw label
    doc.setFont('helvetica', 'normal');
      doc.text(`${label}:`, startX, yPosition);
      
      // Draw value with proper alignment
      if (label === 'Taxable Income') {
        doc.setFont('helvetica', 'bold');
        doc.text(value, valueX, yPosition);
        doc.setFont('helvetica', 'normal');
      } else {
        doc.text(value, valueX, yPosition);
      }
      
      yPosition += 8; // Increased spacing between rows
    });
    
    yPosition += 10;
    
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
    
    // Documents Reviewed
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Documents Reviewed', 20, yPosition);
    yPosition += 10;
    
    if (data?.file_metadata && data.file_metadata.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      data.file_metadata.forEach((file, index) => {
        const filename = file.filename || `Document ${index + 1}`;
        const type = file.type || 'OTHER';
        const company = file.company_name_detected || companyName;
        const year = file.fiscal_year_detected || fiscalYear;
        
        doc.text(`${filename}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Type: ${type} | Company: ${company} | Year: ${year}`, 25, yPosition);
        yPosition += 10;
        
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 30;
        }
      });
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('No specific document details available.', 20, yPosition);
      yPosition += 10;
    }
    
    yPosition += 10;
    
    // Audit Flags & Observations
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Audit Flags & Observations', 20, yPosition);
    yPosition += 10;
    
    if (data?.audit_flags && data.audit_flags.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      data.audit_flags.forEach((flag) => {
        const flagLines = doc.splitTextToSize(`• ${flag}`, 170);
        doc.text(flagLines, 20, yPosition);
        yPosition += flagLines.length * 5 + 3;
        
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 30;
        }
      });
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('• No specific audit flags or observations noted.', 20, yPosition);
      yPosition += 10;
    }
    
    yPosition += 10;
    
    // Summary
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Summary', 20, yPosition);
    yPosition += 10;
    
    const summaryText = `This analysis report provides a comprehensive overview of the financial data for ${companyName} for the fiscal year ${fiscalYear}. The report includes revenue, expenses, taxable income calculations, and final tax obligations based on the provided financial documents.`;
    
    const summaryLines = doc.splitTextToSize(summaryText, 170);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(summaryLines, 20, yPosition);
    
    try {
      // Generate PDF blob
      const pdfBlob = doc.output('blob');
    const fileName = `CIT_Analysis_Report_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${fiscalYear}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save to Supabase storage
      if (userId) {
        const filePath = `${userId}/${Date.now()}_${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('corporate-tax-reports')
          .upload(filePath, pdfBlob, {
            contentType: 'application/pdf',
            cacheControl: '3600'
          });
        
        if (uploadError) {
          console.error('Error uploading PDF to storage:', uploadError);
          // Fallback to local download
    doc.save(fileName);
          return;
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('corporate-tax-reports')
          .getPublicUrl(filePath);
        
        if (urlData?.publicUrl) {
          // Update the analysis record with the report URL
          await updateAnalysisWithReportUrl(urlData.publicUrl);
          
          // Show success message
          alert(`PDF report generated and saved successfully!\nReport URL: ${urlData.publicUrl}`);
          
          // Open the report in new tab
          window.open(urlData.publicUrl, '_blank');
        } else {
          // Fallback to local download
          doc.save(fileName);
        }
      } else {
        // Fallback to local download if user not authenticated
        doc.save(fileName);
      }
    } catch (error) {
      console.error('Error saving PDF to storage:', error);
      // Fallback to local download
      const fileName = `CIT_Analysis_Report_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${fiscalYear}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    }
  };

  const downloadAnalysisReport = (data) => {
    generatePDFReport(data);
  };

  // Function to update analysis record with report URL
  const updateAnalysisWithReportUrl = async (reportUrl) => {
    try {
      if (!userId) {
        console.warn('User not authenticated, cannot update analysis');
        return;
      }

      // Find the most recent analysis for this user
      const { data: analysisData, error } = await supabase
        .from('corporate_tax_analysis')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching analysis data:', error);
        return;
      }

      if (analysisData && analysisData.length > 0) {
        // Update the analysis record with the report URL
        const { error: updateError } = await supabase
          .from('corporate_tax_analysis')
          .update({ report_url: reportUrl })
          .eq('id', analysisData[0].id);

        if (updateError) {
          console.error('Error updating analysis with report URL:', updateError);
        } else {
          console.log('Analysis updated with report URL successfully');
        }
      }
    } catch (error) {
      console.error('Error in updateAnalysisWithReportUrl:', error);
    }
  };

  // Function to copy objection letter template to clipboard with company mapping
  const copyObjectionLetterToClipboard = async () => {
    try {
      // Get company details from existing analysis or use defaults
      const companyName = existingAnalysis?.company_name || 'Stichting V.F.F.V.';
      const fiscalYear = existingAnalysis?.fiscal_year || '2024';
      const currentDate = new Date().toLocaleDateString('en-GB');
      const assessmentDate = new Date().toLocaleDateString('en-GB');
      
      // Create the objection letter template with company mapping
      const objectionLetterTemplate = `Objection Letter Template: Corporate Tax Assessment ${fiscalYear}

[Company Letterhead]
Belastingdienst
[Relevant Tax Office Address]
[Postal Code and City]
The Netherlands

Date: ${currentDate}
Subject: Notice of Objection (Bezwaarschrift) - Corporate Tax Assessment ${fiscalYear}
Tax Reference Number: [Insert Reference Number]
RSIN/KVK Number: [Insert Company Registration Number]
Tax Year: ${fiscalYear}
Assessment Date: ${assessmentDate}

Dear Sir/Madam,

1. Formal Notice of Objection
In accordance with Article 6:4 of the General Administrative Law Act (Algemene wet bestuursrecht) and Article 26 of the General State Taxes Act (Algemene wet inzake rijksbelastingen), I hereby formally submit an objection to the corporate tax assessment referenced above, issued on ${assessmentDate}.

2. Company Details
Legal Name: ${companyName}
Trading Name: [If different from legal name]
Legal Form: [BV, NV, etc.]
Address: [Registered Office Address]
RSIN: [Tax Identification Number]
KVK Number: [Chamber of Commerce Registration Number]
Authorized Representative: [Name and Position]
Contact Information: [Phone, Email]

3. Objection Details

3.1 Specific Aspects of the Assessment Being Contested
I/We object to the following specific aspects of the corporate tax assessment:
1. [Specific item 1, e.g., "The disallowance of €XX,XXX in R&D expenses under the innovation box regime"]
2. [Specific item 2, e.g., "The characterization of income in the amount of €XX,XXX as regular taxable profit rather than as qualifying for the participation exemption"]
3. [Add additional items as necessary]

3.2 Factual Background
[Provide a clear, concise explanation of the relevant facts pertaining to your corporate tax situation for the ${fiscalYear} tax year. Include key dates, transactions, business activities, and any other relevant information.]

3.3 Grounds for Objection

Legal Grounds
The assessment is incorrect based on the following legal grounds:
1. First Objection Point:
   ○ Relevant Law: [e.g., "Article 12b of the Corporate Income Tax Act 1969 (Wet op de vennootschapsbelasting 1969)"]
   ○ Explanation: [Detailed explanation of why the tax authority's position is incorrect based on the law]
   ○ Correct Application: [Explanation of how the law should be correctly applied in this instance]
2. Second Objection Point:
   ○ Relevant Law: [Cite relevant article]
   ○ Explanation: [Detailed explanation]
   ○ Correct Application: [Explanation]
3. [Add additional objection points as necessary]

Factual Grounds
The assessment contains the following factual errors:
1. [Detail factual error 1]
2. [Detail factual error 2]
3. [Add additional factual errors as necessary]

3.4 Correct Tax Position
Based on the legal and factual grounds stated above, the correct tax position should be:
● Taxable amount as per assessment: €[Amount]
● Correct taxable amount: €[Amount]
● Difference: €[Amount]

4. Supporting Documentation
In support of this objection, I/we enclose the following documentation:
1. [List document 1, e.g., "Copy of the contested tax assessment"]
2. [List document 2, e.g., "Financial statements for fiscal year ${fiscalYear}"]
3. [List document 3, e.g., "Documentation supporting R&D expenses"]
4. [Add additional documents as necessary]

5. Request for Suspension of Payment
Pursuant to Article 25 of the Tax Collection Act (Invorderingswet), I/we request suspension of payment for the contested amount until a decision on this objection has been made.

6. Request for Oral Hearing
Pursuant to Article 7:2 of the General Administrative Law Act, I/we request an opportunity to be heard in person regarding this objection before a decision is made.

7. Request for Decision
I/we respectfully request that the Tax Administration:
1. Consider this objection valid and submitted within the statutory time limit;
2. Grant the suspension of payment for the contested amount;
3. Schedule an oral hearing to discuss this objection;
4. Issue a revised assessment in accordance with the correct tax position as outlined above; and
5. Reimburse any overpaid taxes with statutory interest.

Should you require any additional information or clarification, please do not hesitate to contact me/us using the contact details provided above.

Thank you for your attention to this matter.

Yours faithfully,

[Signature]
[Name of Authorized Representative]
[Position]
${companyName}

Enclosures:
1. [List of enclosed documents]
2. [Power of attorney, if applicable]

________________________________________
Note: This objection letter has been filed within the statutory period of six weeks from the date of the assessment, as required by Article 6:7 of the General Administrative Law Act.`;

      // Copy to clipboard
      await navigator.clipboard.writeText(objectionLetterTemplate);
      
      // Show success message
      setUploadSuccess('Objection letter template copied to clipboard with company details!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setUploadError('Failed to copy objection letter template. Please try again.');
      
      // Clear error message after 3 seconds
      setTimeout(() => setUploadError(''), 3000);
    }
  };

  // Show loading state while checking for existing analysis
  if (isCheckingExisting) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              border: '4px solid rgba(59, 130, 246, 0.3)', 
              borderTop: '4px solid #3b82f6', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <h2 style={{ marginTop: '1rem', color: '#fff' }}>Checking Your Corporate Tax Status...</h2>
            <p style={{ color: '#bfc9da' }}>Please wait while we verify your account</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', padding: '1rem' }}>
      {/* Processing Modal */}
      {isProcessing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#0f172a',
            borderRadius: '20px',
            padding: '3rem 2.5rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.8)',
            border: '1px solid #1e293b',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              border: '4px solid rgba(59, 130, 246, 0.3)',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 2rem auto',
              filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))'
            }}></div>
            
            <h3 style={{
              color: '#ffffff',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              Processing Documents
            </h3>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              margin: 0,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
            }}>
              Please wait while we process your documents
            </p>
            
            <div style={{
              marginTop: '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '0.25rem'
            }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.7)',
                    animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                    filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: '#fff' }}>
            Corporate Income Tax Filing
          </h1>
          <p style={{ fontSize: '1rem', color: '#bfc9da' }}>
            Streamlined CIT preparation with intelligent document analysis
          </p>
          {userEmail && (
            <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.3rem' }}>
              Filing for: {userEmail}
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
          {steps.map((stepItem, index) => (
              <div 
              key={index} 
                onClick={() => handleStepClick(index)}
                style={{
                  display: 'flex',
                flexDirection: 'column',
                  alignItems: 'center',
                cursor: index <= step ? 'pointer' : 'not-allowed',
                padding: '0.25rem',
                borderRadius: '4px',
                background: index <= step ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(15, 23, 42, 0.6)',
                border: index <= step ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                minWidth: '40px',
                position: 'relative'
              }}
            >
                <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: index <= step ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.2rem',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: '#fff'
              }}>
                {stepItem.number}
              </div>
              <h3 style={{
                color: index <= step ? '#c4b5fd' : '#fff',
                margin: '0 0 0.1rem 0',
                fontSize: '0.5rem',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                {stepItem.label}
              </h3>
              <p style={{
                color: '#fff',
                margin: '0',
                fontSize: '0.35rem',
                textAlign: 'center',
                lineHeight: '1.1'
              }}>
                {index === 0 && 'Review required documents for CIT filing'}
                {index === 1 && 'Upload your financial documents'}
                {index === 2 && 'AI processing your documents'}
                {index === 3 && 'View your CIT analysis report'}
              </p>
          </div>
        ))}
      </div>

        {/* Step Content */}
        {step === 0 && (
          <div style={{ 
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '16px', 
            padding: '2rem', 
            marginBottom: '1rem',
            boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
          }}>
            {/* Document Title */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ 
                color: '#fff', 
                marginBottom: '0.5rem', 
                fontSize: '1.8rem',
                fontWeight: '700'
              }}>
                Dutch Corporate Income Tax Analysis 2024 - Stichting V.F.F.V.
              </h1>
            </div>

            {/* Account Overview Section */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ 
                color: '#fff', 
                marginBottom: '1rem', 
                fontSize: '1.3rem',
                fontWeight: '600'
              }}>
                Account Overview
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#bfc9da', fontWeight: '500' }}>Account Holder:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>Stichting V.F.F.V.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#bfc9da', fontWeight: '500' }}>KvK Number:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>62871676</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#bfc9da', fontWeight: '500' }}>IBAN:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>NL38 BUNQ 2208 0966 14</span>
                </div>
              </div>
            </div>

            {/* Introduction Section */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ 
                color: '#fff', 
                marginBottom: '1rem', 
                fontSize: '1.3rem',
                fontWeight: '600'
              }}>
                Introduction
              </h2>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: '1rem',
                lineHeight: '1.6',
                marginBottom: '1rem'
              }}>
                Welcome to your streamlined Dutch Corporate Income Tax (CIT) analysis for 2024.
              </p>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: '1rem',
                lineHeight: '1.6',
                margin: 0
              }}>
                At House of Companies, we're committed to empowering you with clear, actionable insights to optimize your tax position and drive your business forward.
              </p>
            </div>

            {/* Key Considerations Section */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ 
                color: '#fff', 
                marginBottom: '1rem', 
                fontSize: '1.3rem',
                fontWeight: '600'
              }}>
                Key Considerations
              </h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ 
                    color: '#3b82f6', 
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    minWidth: '20px'
                  }}>•</span>
                  <div>
                    <span style={{ color: '#fff', fontWeight: '600' }}>Tax Rate: </span>
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                      The standard Dutch Corporate Income Tax (CIT) rate for 2024 is 25.8% for profits exceeding €395,000, and 19% for profits up to €395,000.
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ 
                    color: '#3b82f6', 
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    minWidth: '20px'
                  }}>•</span>
                  <div>
                    <span style={{ color: '#fff', fontWeight: '600' }}>Deductions: </span>
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                      Ensure all business-related expenses are properly documented to maximize deductions.
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ 
                    color: '#3b82f6', 
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    minWidth: '20px'
                  }}>•</span>
                  <div>
                    <span style={{ color: '#fff', fontWeight: '600' }}>Innovation Box: </span>
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                      If a foundation engages in innovative activities, it may qualify for a reduced effective tax rate of 9% on income from these activities.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Required Documents Section */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ 
                color: '#fff', 
                marginBottom: '1rem', 
                fontSize: '1.3rem',
                fontWeight: '600'
              }}>
                Required Documents for CIT Filing
              </h2>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '0.9rem',
                marginBottom: '1.5rem'
              }}>
                Please ensure all documents are complete and up to date
              </p>
            
            {/* Financial Statement Card - Top and Separate */}
            <div style={{ 
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div 
                className="document-card" 
                onClick={() => handleDocumentClick('Financial Statement')}
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 58, 138, 0.2) 100%)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  border: '2px solid rgba(30, 58, 138, 0.4)',
                  boxShadow: '0 4px 15px rgba(15, 23, 42, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '160px',
                  minHeight: '160px',
                  maxHeight: '160px',
                  width: '300px',
                  boxSizing: 'border-box'
                }}
              >
                {/* Icon container */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  color: '#fff',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 2,
                  boxShadow: `0 4px 10px rgba(30, 58, 138, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                }}>
                  <MdAssessment style={{ fontSize: '1.5rem', color: '#fff' }} />
                </div>
                
                {/* Content */}
                <div style={{ 
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 2,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ 
                    color: '#fff', 
                    marginBottom: '0.5rem', 
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    letterSpacing: '0.2px',
                    lineHeight: '1.2',
                    margin: '0 0 0.5rem 0'
                  }}>
                    Financial Statement
                  </h3>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.85)', 
                    margin: 0, 
                    fontSize: '0.8rem',
                    lineHeight: '1.3',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                    padding: '0 0.3rem'
                  }}>
                    Profit & Loss, Balance Sheet for current year
                  </p>
                </div>

                {/* Click indicator */}
                <div className="click-indicator" style={{
                  position: 'absolute',
                  bottom: '0.75rem',
                  right: '0.75rem',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(30, 58, 138, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  color: '#fff',
                  opacity: 0.8,
                  transition: 'all 0.3s ease'
                }}>
                  →
                </div>
              </div>
            </div>

            {/* Other Document Cards - Below Financial Statement */}
            <div style={{ 
              display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1rem',
                marginBottom: '1rem'
            }}>
              {requiredDocuments.slice(1).map((doc, index) => (
                <div 
                  key={index + 1}
                  className="document-card" 
                  onClick={() => handleDocumentClick(doc.title)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 58, 138, 0.2) 100%)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '12px',
                    padding: '1rem',
                    border: '2px solid rgba(30, 58, 138, 0.4)',
                    boxShadow: '0 4px 15px rgba(15, 23, 42, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                      height: '140px',
                      minHeight: '140px',
                      maxHeight: '140px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Icon container */}
                  <div style={{
                      width: '40px',
                      height: '40px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                      fontSize: '1rem',
                    color: '#fff',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 2,
                    boxShadow: `0 4px 10px rgba(30, 58, 138, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                  }}>
                    {doc.icon}
                  </div>
                  
                  {/* Content */}
                  <div style={{ 
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 2,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                      paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{ 
                      color: '#fff', 
                      marginBottom: '0.3rem', 
                        fontSize: '0.9rem',
                      fontWeight: '700',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                      letterSpacing: '0.2px',
                      lineHeight: '1.2',
                      margin: '0 0 0.3rem 0'
                    }}>
                      {doc.title}
                    </h3>
                    <p style={{ 
                      color: 'rgba(255,255,255,0.85)', 
                      margin: 0, 
                        fontSize: '0.7rem',
                      lineHeight: '1.3',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                      padding: '0 0.3rem'
                    }}>
                      {doc.description}
                    </p>
                  </div>

                  {/* Click indicator */}
                  <div className="click-indicator" style={{
                    position: 'absolute',
                      bottom: '0.5rem',
                      right: '0.5rem',
                      width: '20px',
                      height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(30, 58, 138, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                      fontSize: '0.6rem',
                    color: '#fff',
                    opacity: 0.8,
                    transition: 'all 0.3s ease'
                  }}>
                    →
                  </div>
                </div>
              ))}
              </div>
            </div>
            


            {/* Next Steps Section */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ 
                color: '#fff', 
                marginBottom: '1rem', 
                fontSize: '1.3rem',
                fontWeight: '600'
              }}>
                Next Steps
              </h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ 
                    background: '#3b82f6',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>1</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                    Upload complete financial records to a secure platform.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ 
                    background: '#3b82f6',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>2</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                    An AI-powered system will analyze the data and generate preliminary CIT calculations.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ 
                    background: '#3b82f6',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>3</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                    A team of tax experts will review the analysis and provide tailored recommendations.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ 
                    background: '#3b82f6',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>4</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                    You will receive a comprehensive CIT report and strategy, all without the need for traditional accounting overhead.
                  </span>
                </div>
              </div>
            </div>
            

            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '2rem'
            }}>
              <button
                onClick={viewSavedAnalysis}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
                }}
              >
                📊 Previous Analysis
              </button>
              
              <button
                onClick={() => setShowConfirmationModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
                }}
              >
                Proceed
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '2rem', marginBottom: '1rem', border: '1px solid #1e293b' }}>
            <h2 style={{ color: '#fff', marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: '600' }}>
              Upload Documents
            </h2>
            <p style={{ color: '#bfc9da', marginBottom: '2rem', textAlign: 'center', fontSize: '1rem' }}>
              Upload your CIT documents for analysis
            </p>

            {/* Year Selection */}
            <div style={{ 
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <label style={{ 
                color: '#bfc9da', 
                fontSize: '1rem', 
                fontWeight: '500'
              }}>
                Import Year:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '500',
                  minWidth: '100px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
                <option value="2019">2019</option>
                <option value="2018">2018</option>
              </select>
            </div>
            
            {/* Upload Options */}
            <div style={{
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1.5rem', 
              marginBottom: '2rem'
            }}>
              {/* Choose Files Box */}
              <div style={{
                background: '#0f172a',
                borderRadius: '12px',
                padding: '2rem',
                border: '2px dashed #475569',
              textAlign: 'center',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.background = '#0f172a';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = '#475569';
                e.currentTarget.style.background = '#0f172a';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                handleFileUpload({ target: { files } });
                e.currentTarget.style.borderColor = '#475569';
                e.currentTarget.style.background = '#0f172a';
              }}
            >
                <div style={{ 
                  fontSize: '3rem', 
                  color: '#667eea', 
                  marginBottom: '1rem' 
                }}>
                  ⬆️
                </div>
                <h3 style={{ 
                  color: '#fff', 
                  marginBottom: '0.5rem',
                  fontSize: '1.2rem',
                  fontWeight: '600'
                }}>
                  Choose Files
                </h3>
                <p style={{ 
                  color: '#bfc9da', 
                  marginBottom: '1.5rem', 
                  fontSize: '0.9rem',
                  lineHeight: '1.4'
                }}>
                  Upload your CIT documents manually
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
                <button 
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Drag & Drop or Click
                </button>
              </div>



              {/* Import from Base Company Box */}
              <div style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '2rem',
                border: '1px solid #475569',
                textAlign: 'center',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ 
                  fontSize: '3rem', 
                  color: '#ec4899', 
                  marginBottom: '1rem' 
                }}>
                  🏢
                </div>
                <h3 style={{ 
                      color: '#fff',
                  marginBottom: '1rem', 
                  fontSize: '1.2rem',
                  fontWeight: '600'
                }}>
                  Import from Base Company
                </h3>
                <p style={{ 
                  color: '#bfc9da', 
                  marginBottom: '1.5rem', 
                      fontSize: '0.9rem',
                  lineHeight: '1.5'
                }}>
                  Load documents from your base company system
                </p>
                  <button 
                    onClick={fetchAndLoadFinancialDocuments}
                    disabled={!userId || isLoadingDataroomFiles}
                    style={{
                    background: isLoadingDataroomFiles ? '#6b7280' : '#3b82f6',
                      color: '#fff',
                      border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                      cursor: (!userId || isLoadingDataroomFiles) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    gap: '0.5rem',
                    margin: '0 auto',
                      opacity: (!userId || isLoadingDataroomFiles) ? 0.6 : 1,
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseOver={(e) => {
                    if (!isLoadingDataroomFiles && userId) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isLoadingDataroomFiles && userId) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }
                    }}
                  >
                    {isLoadingDataroomFiles ? (
                      <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    ) : (
                      <FaCloudDownloadAlt />
                    )}
                    {isLoadingDataroomFiles 
                    ? 'Loading...' 
                    : 'Import Documents'
                    }
                  </button>
                </div>
            </div>



            {/* Error/Success Messages */}
            {uploadError && (
              <div style={{
                background: '#dc2626',
                color: '#fff',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>{uploadError}</div>
                {uploadError.includes('Server error') && (
                  <button
                    onClick={processDocuments}
                    style={{
                      background: '#fff',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginTop: '0.5rem'
                    }}
                  >
                    Retry Processing
                  </button>
                )}
              </div>
            )}
            {uploadSuccess && (
              <div style={{
                background: '#059669',
                color: '#fff',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                {uploadSuccess}
              </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Uploaded Documents</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {uploadedFiles.map((file) => (
                    <div key={file.id} style={{
                      background: '#1e293b',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid #475569'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <HiDocumentText style={{ color: '#dc2626', fontSize: '1.5rem' }} />
    <div>
                          <p style={{ color: '#fff', margin: 0, fontWeight: 'bold' }}>{file.name}</p>
                          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>
                            {file.size > 0 ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Size not available'} • Uploaded: {file.uploadedAt}
                            {file.source === 'financial_hub' && (
                              <span style={{ color: '#3b82f6', marginLeft: '8px' }}>• From Financial Hub</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* View Button - Show for all files */}
                                                  <button
                            onClick={() => handleViewFile(file)}
                            style={{
                              background: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                              transition: 'all 0.2s ease'
                            }}
                            title="View File"
                            onMouseEnter={(e) => {
                              e.target.style.background = '#1d4ed8';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#3b82f6';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            <IoEyeOutline style={{ fontSize: '1.1rem' }} />
                          </button>
                        
                        {/* Download Button - Show for all files */}
                                                  <button
                            onClick={() => handleDownloadFile(file)}
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                              transition: 'all 0.2s ease'
                            }}
                            title="Download File"
                            onMouseEnter={(e) => {
                              e.target.style.background = '#059669';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#10b981';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            <IoDownloadOutline style={{ fontSize: '1.1rem' }} />
                          </button>
                        
                        {/* Remove Button */}
                                                  <button
                            onClick={() => removeFile(file.id)}
                            style={{
                              background: '#dc2626',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
                              transition: 'all 0.2s ease'
                            }}
                            title="Remove File"
                            onMouseEnter={(e) => {
                              e.target.style.background = '#b91c1c';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#dc2626';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            <IoTrashOutline style={{ fontSize: '1.1rem' }} />
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proceed Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  if (uploadedFiles.length > 0) {
                    setShowApprovalModal(true);
                  }
                }}
                disabled={isProcessing || uploadedFiles.length === 0}
                style={{
                  background: isProcessing || uploadedFiles.length === 0 ? '#6b7280' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: isProcessing || uploadedFiles.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  margin: '0 auto'
                }}
              >
                {isProcessing && <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
                {isProcessing ? 'Processing Documents...' : 'Approve to Analysis'}
              </button>
    </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ color: '#fff', marginBottom: '1.5rem', textAlign: 'center' }}>
              Corporate Income Tax Analysis Report
            </h2>
            
            {processedResult && (
              <div>
                {processedResult.data?.detail ? (
                  // Show error message from API
                  <div style={{ 
                    background: '#1e293b', 
                    borderRadius: '12px', 
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    border: '1px solid #475569'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      marginBottom: '1rem'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                      <h3 style={{ color: '#fbbf24', margin: 0 }}>
                        {processedResult.type === 'error' ? 'Server Error' : 'Analysis Notice'}
                      </h3>
              </div>
                    <p style={{ 
                      color: processedResult.type === 'error' ? '#f87171' : '#fbbf24', 
                      fontSize: '1.1rem',
                      lineHeight: '1.6',
                      margin: 0
                    }}>
                      {processedResult.data.detail}
                    </p>
                    <div style={{ 
                      marginTop: '1rem',
                      padding: '1rem',
                      background: '#374151',
                      borderRadius: '8px'
                    }}>
                      <p style={{ color: '#d1d5db', margin: 0, fontSize: '0.9rem' }}>
                        {processedResult.type === 'error' ? (
                          <span>
                            <strong>What to do:</strong> This appears to be a server-side issue. 
                            Please try again later or contact support if the problem persists.
                          </span>
                        ) : (
                          <span>
                            <strong>Suggestion:</strong> Please ensure you upload the primary financial documents 
                            such as Profit & Loss Statement or Annual Report for proper analysis.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                                ) : (
                  // Show successful analysis result in professional format
                  <div>
                    <div style={{ 
                      background: '#1e293b', 
                      borderRadius: '12px', 
                      padding: '2rem',
                      marginBottom: '2rem',
                      border: '1px solid #475569'
                    }}>
                      {/* Report Header */}
                      <div style={{ 
                        borderBottom: '2px solid #059669',
                        paddingBottom: '1rem',
                        marginBottom: '2rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.5rem'
                        }}>
                          <FaCheckCircle style={{ color: '#059669', fontSize: '1.5rem' }} />
                          <h3 style={{ color: '#059669', margin: 0, fontSize: '1.8rem' }}>Corporate Analysis Report</h3>
                        </div>
                        <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem' }}>
                          Generated on {new Date().toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      {/* Professional Report Display */}
                      <div style={{ display: 'grid', gap: '2rem' }}>
                        {/* Executive Summary */}
                        <div style={{
                          background: '#374151',
                          borderRadius: '8px',
                          padding: '1.5rem',
                          border: '1px solid #4b5563'
                        }}>
                          <h4 style={{ 
                            color: '#3b82f6', 
                            margin: '0 0 1rem 0',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                          }}>
                            1. Executive Summary
                          </h4>
                          <p style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                            This report summarizes the key financial metrics and observations for{' '}
                            <strong>{formatReportData(processedResult.data).companyName}</strong> for the fiscal year{' '}
                            <strong>{formatReportData(processedResult.data).fiscalYear}</strong>, based on the provided documents and extracted data.
                          </p>
                        </div>

                        {/* Company & Fiscal Information */}
                        <div style={{
                          background: '#374151',
                          borderRadius: '8px',
                          padding: '1.5rem',
                          border: '1px solid #4b5563'
                        }}>
                          <h4 style={{ 
                            color: '#3b82f6', 
                            margin: '0 0 1rem 0',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                          }}>
                            2. Company & Fiscal Information
                          </h4>
                          <div style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.8' }}>
                            <p style={{ margin: '0 0 0.5rem 0' }}>
                              <strong>Company Name:</strong> {formatReportData(processedResult.data).companyName}
                            </p>
                            <p style={{ margin: '0' }}>
                              <strong>Fiscal Year:</strong> {formatReportData(processedResult.data).fiscalYear}
                            </p>
                          </div>
                        </div>

                        {/* Financial Breakdown */}
                        <div style={{
                          background: '#374151',
                          borderRadius: '8px',
                          padding: '1.5rem',
                          border: '1px solid #4b5563'
                        }}>
                          <h4 style={{ 
                            color: '#3b82f6', 
                            margin: '0 0 1rem 0',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                          }}>
                            3. Financial Breakdown
                          </h4>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '0.5rem',
                            background: '#1f2937',
                            borderRadius: '6px',
                            padding: '1rem',
                            fontSize: '0.95rem'
                          }}>
                            <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>Item</div>
                            <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>Amount</div>
                            
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Revenue</div>
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{formatCurrency(formatReportData(processedResult.data).revenue)}</div>
                            
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Expenses</div>
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{formatCurrency(formatReportData(processedResult.data).expenses)}</div>
                            
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Depreciation</div>
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{formatCurrency(formatReportData(processedResult.data).depreciation)}</div>
                            
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Deductions</div>
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{formatCurrency(formatReportData(processedResult.data).deductions)}</div>
                            
                            <div style={{ color: '#10b981', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #4b5563', paddingTop: '0.5rem' }}>Taxable Income</div>
                            <div style={{ color: '#10b981', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #4b5563', paddingTop: '0.5rem' }}>{formatCurrency(formatReportData(processedResult.data).taxableIncome)}</div>
                            
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Applied Tax Rate</div>
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{formatReportData(processedResult.data).taxRate}</div>
                            
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Final Tax Owed</div>
                            <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{formatCurrency(formatReportData(processedResult.data).finalTaxOwed)}</div>
                          </div>
                        </div>

                        {/* Documents Reviewed */}
                        <div style={{
                          background: '#374151',
                          borderRadius: '8px',
                          padding: '1.5rem',
                          border: '1px solid #4b5563'
                        }}>
                          <h4 style={{ 
                            color: '#3b82f6', 
                            margin: '0 0 1rem 0',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                          }}>
                            4. Documents Reviewed
                          </h4>
                          {formatReportData(processedResult.data).documents.length > 0 ? (
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                              gap: '0.5rem',
                              background: '#1f2937',
                              borderRadius: '6px',
                              padding: '1rem',
                              fontSize: '0.9rem'
                            }}>
                              <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>Filename</div>
                              <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>Type</div>
                              <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>Company Detected</div>
                              <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>Fiscal Year</div>
                              
                              {formatReportData(processedResult.data).documents.map((doc, index) => (
                                <React.Fragment key={index}>
                                  <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{doc.filename || `Document ${index + 1}`}</div>
                                  <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{doc.type || 'OTHER'}</div>
                                  <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{doc.company_detected || 'Unknown Company'}</div>
                                  <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{doc.fiscal_year || new Date().getFullYear()}</div>
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: '#d1d5db', margin: 0 }}>No specific document details available in the analysis.</p>
                          )}
                        </div>

                        {/* Observations & Notes */}
                        <div style={{
                          background: '#374151',
                          borderRadius: '8px',
                          padding: '1.5rem',
                          border: '1px solid #4b5563'
                        }}>
                          <h4 style={{ 
                            color: '#3b82f6', 
                            margin: '0 0 1rem 0',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                          }}>
                            5. Observations & Notes
                          </h4>
                          <div style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.6' }}>
                            {formatReportData(processedResult.data).observations.length > 0 ? (
                              formatReportData(processedResult.data).observations.map((obs, index) => (
                                <p key={index} style={{ margin: '0 0 0.5rem 0' }}>⚠️ {obs}</p>
                              ))
                            ) : (
                              <p style={{ margin: '0' }}>⚠️ Depreciation not found and no specific schedule was provided. Assumed to be zero.</p>
                            )}
                          </div>
                        </div>

                        {/* Recommendations */}
                        <div style={{
                          background: '#374151',
                          borderRadius: '8px',
                          padding: '1.5rem',
                          border: '1px solid #4b5563'
                        }}>
                          <h4 style={{ 
                            color: '#3b82f6', 
                            margin: '0 0 1rem 0',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                          }}>
                            6. Recommendations
                          </h4>
                          <div style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.6' }}>
                            {formatReportData(processedResult.data).recommendations.length > 0 ? (
                              formatReportData(processedResult.data).recommendations.map((rec, index) => (
                                <p key={index} style={{ margin: '0 0 0.5rem 0' }}>• {rec}</p>
                              ))
                            ) : (
                              <>
                                <p style={{ margin: '0 0 0.5rem 0' }}>• Review depreciation schedule for accuracy and completeness.</p>
                                <p style={{ margin: '0 0 0.5rem 0' }}>• Investigate why revenue is reported as €0 while expenses are significant.</p>
                                <p style={{ margin: '0' }}>• Validate supporting documents for any missing or misclassified items.</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Download Button */}
            <div style={{
                      textAlign: 'center',
                      marginBottom: '2rem'
                    }}>
                      <button
                        onClick={() => downloadAnalysisReport(processedResult.data)}
                        style={{
                          background: '#059669',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '1rem 2rem',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          margin: '0 auto',
                          marginBottom: '1rem'
                        }}
                      >
                        <FaDownload />
                        Generate & Save PDF Report
                      </button>
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>
                        The report will be saved to your account and can be accessed anytime
                      </p>
                </div>
                </div>
                )}
              </div>
            )}
            
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={downloadResult}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0 auto'
                }}
              >
                <FaArrowRight />
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ color: '#fff', marginBottom: '1.5rem' }}>
              CIT Filing Complete
            </h2>
            <FaCheckCircle style={{ fontSize: '4rem', color: '#059669', marginBottom: '1rem' }} />
            <p style={{ color: '#bfc9da', marginBottom: '2rem', fontSize: '1.1rem' }}>
              Your Corporate Income Tax analysis has been completed and saved to your account.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/Tax')}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Return to Tax Dashboard
              </button>
              <button
                onClick={viewSavedAnalysis}
                style={{
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                View Saved Analysis
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Display Analysis Results */}
        {step === 4 && processedResult && processedResult.data && (
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ color: '#fff', marginBottom: '1rem' }}>
                Your Corporate Tax Analysis
              </h2>
              <p style={{ color: '#bfc9da', fontSize: '1.1rem' }}>
                Analysis completed on {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Company Info */}
            {processedResult.data?.general_information && (
                  <div style={{
                    background: '#374151',
                    borderRadius: '8px',
                    padding: '1.5rem',
                border: '1px solid #4b5563',
                marginBottom: '1.5rem'
                  }}>
                    <h4 style={{ 
                      color: '#3b82f6', 
                      margin: '0 0 1rem 0',
                      fontSize: '1.2rem',
                      fontWeight: 'bold'
                    }}>
                      Company Information
                    </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <span style={{ color: '#9ca3af' }}>Company:</span>
                  <span style={{ color: '#d1d5db' }}>{processedResult.data.general_information.company_name || 'N/A'}</span>
                  <span style={{ color: '#9ca3af' }}>Fiscal Year:</span>
                  <span style={{ color: '#d1d5db' }}>{processedResult.data.general_information.fiscal_year || 'N/A'}</span>
                    </div>
                  </div>
            )}

                  {/* Financial Summary */}
            {(() => {
              console.log('🔍 Financial Summary Debug - Full processedResult:', processedResult);
              console.log('🔍 Breakdown data:', processedResult.data?.tax_return_summary?.breakdown);
              console.log('🔍 Revenue value:', processedResult.data?.tax_return_summary?.breakdown?.Revenue);
              return processedResult.data?.tax_return_summary?.breakdown;
            })() && (
                  <div style={{
                    background: '#374151',
                    borderRadius: '8px',
                    padding: '1.5rem',
                border: '1px solid #4b5563',
                marginBottom: '1.5rem'
                  }}>
                    <h4 style={{ 
                      color: '#3b82f6', 
                      margin: '0 0 1rem 0',
                      fontSize: '1.2rem',
                      fontWeight: 'bold'
                    }}>
                      Financial Summary
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '0.5rem',
                      background: '#1f2937',
                      borderRadius: '6px',
                      padding: '1rem',
                      fontSize: '0.95rem'
                    }}>
                  <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>ITEM</div>
                  <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>AMOUNT</div>
                      
                      {/* Debug Info - Show exact API values */}
                      <div style={{ 
                        background: '#1f2937', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        marginBottom: '0.5rem',
                        fontSize: '0.8rem',
                        color: '#9ca3af',
                        gridColumn: '1 / -1'
                      }}>
                        <strong>🔍 API Values (Raw):</strong><br/>
                        Revenue: {JSON.stringify(processedResult.data.tax_return_summary.breakdown.Revenue)} (Type: {typeof processedResult.data.tax_return_summary.breakdown.Revenue})<br/>
                        Expenses: {JSON.stringify(processedResult.data.tax_return_summary.breakdown.Expenses)} (Type: {typeof processedResult.data.tax_return_summary.breakdown.Expenses})<br/>
                        Taxable Income: {JSON.stringify(processedResult.data.tax_return_summary.breakdown['Taxable Income'])} (Type: {typeof processedResult.data.tax_return_summary.breakdown['Taxable Income']})<br/>
                        Applied Tax Rate: {JSON.stringify(processedResult.data.tax_return_summary.breakdown['Applied Tax Rate'])} (Type: {typeof processedResult.data.tax_return_summary.breakdown['Applied Tax Rate']})<br/>
                        Final Tax Owed: {JSON.stringify(processedResult.data.tax_return_summary.breakdown['Final Tax Owed'])} (Type: {typeof processedResult.data.tax_return_summary.breakdown['Final Tax Owed']})<br/>
                        <br/>
                        <strong>🔍 Full Breakdown Object:</strong><br/>
                        {JSON.stringify(processedResult.data.tax_return_summary.breakdown, null, 2)}
                      </div>
                      
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Revenue</div>
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0', textAlign: 'right' }}>
                        {(() => {
                          const revenueValue = processedResult.data.tax_return_summary.breakdown.Revenue;
                          console.log('🔍 Revenue Display Debug:', {
                            rawValue: revenueValue,
                            type: typeof revenueValue,
                            truthy: !!revenueValue,
                            numberValue: Number(revenueValue),
                            isZero: revenueValue === 0,
                            isNull: revenueValue === null,
                            isUndefined: revenueValue === undefined
                          });
                          
                          if (revenueValue && revenueValue !== 0) {
                            return `€${Number(revenueValue).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                          } else {
                            return '€0.00';
                          }
                        })()}
                      </div>
                      
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Expenses</div>
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0', textAlign: 'right' }}>
                        {processedResult.data.tax_return_summary.breakdown.Expenses ? 
                          `€${Number(processedResult.data.tax_return_summary.breakdown.Expenses).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
                          '€0.00'
                        }
                      </div>
                      
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Depreciation</div>
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0', textAlign: 'right' }}>
                        {processedResult.data.tax_return_summary.breakdown.Depreciation ? 
                          `€${Number(processedResult.data.tax_return_summary.breakdown.Depreciation).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
                          '€0.00'
                        }
                      </div>
                      
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Deductions</div>
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0', textAlign: 'right' }}>
                        {processedResult.data.tax_return_summary.breakdown.Deductions ? 
                          `€${Number(processedResult.data.tax_return_summary.breakdown.Deductions).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
                          '€0.00'
                        }
                      </div>
                      
                      <div style={{ color: '#10b981', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #4b5563', paddingTop: '0.5rem' }}>Taxable Income</div>
                      <div style={{ color: '#10b981', padding: '0.5rem 0', fontWeight: 'bold', textAlign: 'right', borderTop: '1px solid #4b5563', paddingTop: '0.5rem' }}>
                        {processedResult.data.tax_return_summary.breakdown['Taxable Income'] ? 
                          `€${Number(processedResult.data.tax_return_summary.breakdown['Taxable Income']).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
                          '€0.00'
                        }
                      </div>
                      
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Applied Tax Rate</div>
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0', textAlign: 'right' }}>
                        {processedResult.data.tax_return_summary.breakdown['Applied Tax Rate'] || '0%'}
                      </div>
                      
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Final Tax Owed</div>
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0', textAlign: 'right' }}>
                        {processedResult.data.tax_return_summary.breakdown['Final Tax Owed'] ? 
                          `€${Number(processedResult.data.tax_return_summary.breakdown['Final Tax Owed']).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
                          '€0.00'
                        }
                    </div>
                  </div>
                </div>
            )}

                {/* Action Buttons */}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                    console.log('Button clicked - processedResult.data:', processedResult.data);
                    generatePDFReport(processedResult.data);
                      }}
                      style={{
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                    fontWeight: '600',
                        cursor: 'pointer',
                    transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <FaDownload />
                      Download PDF Report
                    </button>
                  
                    <button
                      onClick={startNewAnalysis}
                      style={{
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                    fontWeight: '600',
                        cursor: 'pointer',
                    transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                  Start New Analysis
                    </button>
                  </div>
                </div>
          </div>
        )}

        {/* Step 4: Display Existing Analysis (when no processed result) */}
        {step === 4 && !processedResult && existingAnalysis && (
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ color: '#fff', marginBottom: '1rem' }}>
                Your Corporate Tax Analysis
              </h2>
              <p style={{ color: '#bfc9da', fontSize: '1.1rem' }}>
                Analysis completed on {existingAnalysis ? new Date(existingAnalysis.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Company Information */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{
                color: '#3b82f6',
                marginBottom: '1rem',
                fontSize: '1.2rem',
                fontWeight: '600'
              }}>
                Company Information
              </h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#bfc9da' }}>Company:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>
                    {existingAnalysis?.company_name || 'Stichting V.F.F.V.'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#bfc9da' }}>Fiscal Year:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>
                    {existingAnalysis?.fiscal_year || '2024'}
                  </span>
                </div>
              </div>
            </div>



            {/* Financial Summary */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{
                color: '#3b82f6',
                marginBottom: '1rem',
                fontSize: '1.2rem',
                fontWeight: '600'
              }}>
                Financial Summary
              </h3>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead>
                    <tr style={{
                      background: 'rgba(30, 58, 138, 0.3)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        color: '#fff',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                      }}>
                        Item
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'right',
                        color: '#fff',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                      }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', color: '#bfc9da' }}>Revenue</td>
                      <td style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        color: '#fff',
                        fontWeight: '600'
                      }}>
                        €{(() => {
                          // Try to get revenue from different possible sources
                          if (existingAnalysis?.revenue) {
                            return Number(existingAnalysis.revenue).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                          }
                          // Try to parse from raw_analysis_data if available
                          if (existingAnalysis?.raw_analysis_data) {
                            try {
                              const parsedData = JSON.parse(existingAnalysis.raw_analysis_data);
                              const revenue = parsedData?.tax_return_summary?.breakdown?.Revenue;
                              if (revenue) {
                                return Number(revenue).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                              }
                            } catch (e) {
                              console.warn('Could not parse raw analysis data for revenue');
                            }
                          }
                          return '0,00';
                        })()}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', color: '#bfc9da' }}>Expenses</td>
                      <td style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        color: '#fff',
                        fontWeight: '600'
                      }}>
                        €{(() => {
                          // Try to get expenses from different possible sources
                          if (existingAnalysis?.expenses) {
                            return Number(existingAnalysis.expenses).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                          }
                          // Try to parse from raw_analysis_data if available
                          if (existingAnalysis?.raw_analysis_data) {
                            try {
                              const parsedData = JSON.parse(existingAnalysis.raw_analysis_data);
                              const expenses = parsedData?.tax_return_summary?.breakdown?.Expenses;
                              if (expenses) {
                                return Number(expenses).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                              }
                            } catch (e) {
                              console.warn('Could not parse raw analysis data for expenses');
                            }
                          }
                          return '0,00';
                        })()}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', color: '#bfc9da' }}>Taxable Income</td>
                      <td style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        color: (() => {
                          // Try to get taxable income from different possible sources
                          let taxableIncome = 0;
                          if (existingAnalysis?.taxable_income) {
                            taxableIncome = Number(existingAnalysis.taxable_income);
                          } else if (existingAnalysis?.raw_analysis_data) {
                            try {
                              const parsedData = JSON.parse(existingAnalysis.raw_analysis_data);
                              const income = parsedData?.tax_return_summary?.breakdown?.['Taxable Income'];
                              if (income) {
                                taxableIncome = Number(income);
                              }
                            } catch (e) {
                              console.warn('Could not parse raw analysis data for taxable income');
                            }
                          }
                          return taxableIncome < 0 ? '#10b981' : '#fff';
                        })() < 0 ? '#10b981' : '#fff',
                        fontWeight: '600'
                      }}>
                        €{(() => {
                          // Try to get taxable income from different possible sources
                          if (existingAnalysis?.taxable_income) {
                            return Number(existingAnalysis.taxable_income).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                          }
                          // Try to parse from raw_analysis_data if available
                          if (existingAnalysis?.raw_analysis_data) {
                            try {
                              const parsedData = JSON.parse(existingAnalysis.raw_analysis_data);
                              const income = parsedData?.tax_return_summary?.breakdown?.['Taxable Income'];
                              if (income) {
                                return Number(income).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                              }
                            } catch (e) {
                              console.warn('Could not parse raw analysis data for taxable income');
                            }
                          }
                          return '0,00';
                        })()}
                      </td>
                    </tr>
                    <tr style={{
                      background: 'rgba(30, 58, 138, 0.2)',
                      borderTop: '2px solid rgba(30, 58, 138, 0.4)'
                    }}>
                      <td style={{ 
                        padding: '1rem', 
                        color: '#fff',
                        fontWeight: '600'
                      }}>
                        Final Tax Owed
                      </td>
                      <td style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '1.1rem'
                      }}>
                        €{(() => {
                          // Try to get final tax owed from different possible sources
                          if (existingAnalysis?.final_tax_owed) {
                            return Number(existingAnalysis.final_tax_owed).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                          }
                          // Try to parse from raw_analysis_data if available
                          if (existingAnalysis?.raw_analysis_data) {
                            try {
                              const parsedData = JSON.parse(existingAnalysis.raw_analysis_data);
                              const taxOwed = parsedData?.tax_return_summary?.breakdown?.['Final Tax Owed'];
                              if (taxOwed) {
                                return Number(taxOwed).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                              }
                            } catch (e) {
                              console.warn('Could not parse raw analysis data for final tax owed');
                            }
                          }
                          return '0,00';
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Report URL Section */}
            {existingAnalysis?.report_url && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{
                  color: '#3b82f6',
                  marginBottom: '1rem',
                  fontSize: '1.2rem',
                  fontWeight: '600'
                }}>
                  Generated Report
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: 'rgba(30, 58, 138, 0.2)',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid rgba(30, 58, 138, 0.4)'
                }}>
                  <span style={{ fontSize: '2rem' }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#fff', margin: '0 0 0.5rem 0', fontWeight: '600' }}>
                      Corporate Tax Analysis Report
                    </p>
                    <p style={{ color: '#bfc9da', margin: 0, fontSize: '0.9rem' }}>
                      Generated on {new Date(existingAnalysis.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => window.open(existingAnalysis.report_url, '_blank')}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#059669';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = '#10b981';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <FaEye /> View Report
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => downloadAnalysisReport(existingAnalysis)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
                }}
              >
                <span>📄</span>
                Download PDF Report
              </button>
              
              <button
                onClick={() => {
                  startNewAnalysis();
                }}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
                }}
              >
                <span>🔄</span>
                Start New Analysis
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmationModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.8)',
              border: '1px solid #1e293b'
            }}>
              <h3 style={{
                color: '#fff',
                marginBottom: '1.5rem',
                textAlign: 'center',
                fontSize: '1.3rem',
                fontWeight: '600'
              }}>
                Financial Statement Confirmation
              </h3>
              <p style={{
                color: '#bfc9da',
                marginBottom: '2rem',
                textAlign: 'center',
                fontSize: '1.1rem',
                lineHeight: '1.6'
              }}>
                Is the financial statement ready for current financial year before applying for CIT?
              </p>
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setStep(1); // Proceed to step 1 (Upload Documents)
                  }}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#059669';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#10b981';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    navigate('/financial-overview');
                  }}
                  style={{
                    background: '#6b7280',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#4b5563';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#6b7280';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}






            {/* Company Information */}
           

            {/* Financial Summary */}
            

            {/* Action Buttons */}
           
          </div>
        {/* Approval Modal */}
        {showApprovalModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.8)',
              border: '1px solid #1e293b'
            }}>
              {/* Header */}
              <h2 style={{
                color: '#fff',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '0 0 1.5rem 0',
                textAlign: 'center'
              }}>
                Approve Corporate Income Tax Analysis
              </h2>

              {/* Information Banner */}
              <div style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  color: '#3b82f6',
                  fontSize: '1.2rem'
                }}>
                  ⚠️
                </div>
                <p style={{
                  color: '#bfc9da',
                  margin: 0,
                  fontSize: '0.95rem',
                  lineHeight: '1.5'
                }}>
                  Please review the tax analysis carefully. Your approval will initiate the preparation process for your Corporate Income Tax filing.
                </p>
              </div>

              {/* Analysis Document Section */}
              <div style={{
                background: '#0f172a',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid #1e293b'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    color: '#3b82f6'
                  }}>
                    📄
                  </div>
                  <div>
                    <h3 style={{
                      color: '#fff',
                      margin: '0 0 0.25rem 0',
                      fontSize: '1.1rem',
                      fontWeight: '600'
                    }}>
                      Dutch Corporate Income Tax Analysis 2024
                    </h3>
                    <p style={{
                      color: '#bfc9da',
                      margin: 0,
                      fontSize: '0.9rem'
                    }}>
                      For Stichting V.F.F.V.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // View analysis details
                    console.log('View analysis clicked');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#1e293b';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'none';
                  }}
                >
                  👁️
                </button>
              </div>

              {/* Approval Checkbox */}
              <div style={{
                marginBottom: '1.5rem'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={approvalChecked}
                    onChange={(e) => setApprovalChecked(e.target.checked)}
                    style={{
                      marginTop: '0.25rem',
                      transform: 'scale(1.2)'
                    }}
                  />
                  <div>
                    <p style={{
                      color: '#fff',
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.95rem',
                      lineHeight: '1.5'
                    }}>
                      I approve this tax analysis and confirm that the information appears accurate to the best of my knowledge
                    </p>
                    <p style={{
                      color: '#bfc9da',
                      margin: 0,
                      fontSize: '0.85rem',
                      lineHeight: '1.4'
                    }}>
                      By checking this box, you acknowledge that you have reviewed the tax analysis and are ready to proceed with CIT preparation.
                    </p>
                  </div>
                </label>
              </div>



              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalChecked(false);
                  }}
                  style={{
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (approvalChecked) {
                      setShowApprovalModal(false);
                      setApprovalChecked(false);
                      processDocuments();
                    }
                  }}
                  disabled={!approvalChecked}
                  style={{
                    background: approvalChecked ? '#3b82f6' : '#475569',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: approvalChecked ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Approve & Proceed
                </button>
              </div>
            </div>
          </div>
        )}

      {/* File Upload Modal */}
      {showFileUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '70vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(15, 23, 42, 0.8)',
            border: '1px solid #1e293b',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '0.75rem'
            }}>
              <h2 style={{
                color: '#fff',
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: 0
              }}>
                📄 Upload Documents
              </h2>
              <button
                onClick={() => setShowFileUploadModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#bfc9da',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = '#fff';
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#bfc9da';
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ×
              </button>
            </div>

            {/* File Selection Area */}
            <div style={{
              background: '#0f172a',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid #1e293b'
            }}>
              <h3 style={{
                color: '#fff',
                marginBottom: '0.75rem',
                fontSize: '1rem',
                fontWeight: '500'
              }}>
                Select Files
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: '#374151',
                borderRadius: '6px',
                padding: '0.75rem',
                border: '1px solid #4b5563'
              }}>
                <button
                  onClick={() => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.multiple = true;
                    fileInput.accept = '.pdf,.xlsx,.xls,.csv';
                    fileInput.onchange = (event) => {
                      handleFileUpload(event);
                    };
                    fileInput.click();
                  }}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#2563eb';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#3b82f6';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <FaFileUpload style={{ fontSize: '0.9rem' }} />
                  Choose Files
                </button>
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                  {uploadedFiles.length === 0 ? 'No files selected' : `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {/* Selected Files */}
            {uploadedFiles.length > 0 && (
              <div style={{
                background: '#1e293b',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <h3 style={{
                  color: '#fff',
                  marginBottom: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>
                  Selected Files ({uploadedFiles.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {uploadedFiles.map((file, index) => (
                    <div key={file.id} style={{
                      background: '#374151',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      border: '1px solid #4b5563'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flex: 1,
                          minWidth: 0
                        }}>
                          <span style={{ fontSize: '1rem' }}>📄</span>
                          <span style={{ 
                            color: '#fff', 
                            fontSize: '0.85rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {file.name}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                          <button
                            onClick={() => removeFile(file.id)}
                            style={{
                              background: '#dc2626',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.background = '#b91c1c';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = '#dc2626';
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <label style={{
                          color: '#9ca3af',
                          fontSize: '0.75rem',
                          marginBottom: '0.25rem',
                          display: 'block'
                        }}>
                          Document Type:
                        </label>
                        <select
                          value={file.documentType || ''}
                          onChange={(e) => {
                            const updatedFiles = [...uploadedFiles];
                            updatedFiles[index].documentType = e.target.value;
                            setUploadedFiles(updatedFiles);
                          }}
                          style={{
                            background: '#1f2937',
                            color: '#fff',
                            border: '1px solid #4b5563',
                            borderRadius: '4px',
                            padding: '0.4rem',
                            fontSize: '0.8rem',
                            width: '100%',
                            outline: 'none'
                          }}
                        >
                          <option value="">Select type...</option>
                          <option value="Financial Statement">Financial Statement</option>
                          <option value="Profit and Loss Statement">Profit & Loss</option>
                          <option value="Trial Balance">Trial Balance</option>
                          <option value="Balance Sheet">Balance Sheet</option>
                          <option value="Cashflow Statement">Cashflow</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div style={{ 
              textAlign: 'center',
              marginTop: '1.5rem'
            }}>
              <button
                onClick={() => {
                  if (uploadedFiles.length > 0) {
                    setShowFileUploadModal(false);
                  }
                }}
                disabled={uploadedFiles.length === 0}
                style={{
                  background: uploadedFiles.length > 0 
                    ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' 
                    : '#6b7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: uploadedFiles.length > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  minWidth: '140px'
                }}
                onMouseOver={(e) => {
                  if (uploadedFiles.length > 0) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  if (uploadedFiles.length > 0) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                Upload {uploadedFiles.length} Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 