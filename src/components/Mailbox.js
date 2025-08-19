import React, { useState, useEffect } from 'react';
import './Mailbox.css'; 
import { FaShippingFast } from 'react-icons/fa';
import { FaDownload } from 'react-icons/fa';
import { FaEye } from 'react-icons/fa';
import { FaRobot } from 'react-icons/fa';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { supabase } from './SupabaseClient';
import { MdOutlineDownload, MdOutlineVisibility, MdOutlineAutoFixHigh, MdOutlineUpload } from 'react-icons/md'; 
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import AnalysisModal from './AnalysisModal'; // Import the new modal component
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const initialIncomingMail = [
  {
    id: 1,
    sender: 'Letter',
    subject: 'Sample Subject',
    date: '12/04/2024',
    tags: [],
    filePath: 'path/to/sample.pdf'
  }
];

const Mailbox = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('all-documents');
  // Prepare Shipment form state
  const [shipmentType, setShipmentType] = useState('Objection Letter'); // Default to first option
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [shipmentContents, setShipmentContents] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('Standard');
  const [tracking, setTracking] = useState(false);
  const [deliveryConfirmation, setDeliveryConfirmation] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(null); // Initialize as null for DatePicker
  const [shipments, setShipments] = useState([]); // Initialize shipments as empty array
  const [selectedFile, setSelectedFile] = useState(null); // State for the file selected for upload
  // Add this state for tracking upload status
  const [uploading, setUploading] = useState(false);
  // Add state for controlling shipment type dropdown
  const [showShipmentTypeDropdown, setShowShipmentTypeDropdown] = useState(false);
  // Add state for controlling template preview
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  // State for Incoming Mail
  const [incomingMail, setIncomingMail] = useState(initialIncomingMail);
  const [loadingMail, setLoadingMail] = useState(true);
  const [mailError, setMailError] = useState(null);

  // State for Outgoing Emails
  const [outgoingEmails, setOutgoingEmails] = useState([]);
  const [loadingOutgoingEmails, setLoadingOutgoingEmails] = useState(false);
  const [outgoingEmailsError, setOutgoingEmailsError] = useState(null);
  const [analyzingDocument, setAnalyzingDocument] = useState(null);

  // State for the document associated with the selected shipment type
  const [selectedShipmentDocument, setSelectedShipmentDocument] = useState(null);

  // State for the popup and analyzed mail
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analyzedMail, setAnalyzedMail] = useState(null);

  // State for corporate tax analysis
  const [corporateAnalysis, setCorporateAnalysis] = useState(null);
  const [loadingCorporateAnalysis, setLoadingCorporateAnalysis] = useState(false);
  const [corporateAnalysisError, setCorporateAnalysisError] = useState(null);
  const [corporateTaxReports, setCorporateTaxReports] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [allCorporateAnalyses, setAllCorporateAnalyses] = useState([]);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelFormData, setChannelFormData] = useState({
    title: '',
    processType: 'Corporate Tax',
    priority: 'Normal',
    dueDate: '',
    detectByReference: '',
    taxIdRsin: '',
    companyName: 'Acme Holdings B.V.'
  });

  // Define a mapping of shipment types to their actual file paths in Supabase Storage
  // IMPORTANT: Replace these placeholder paths with the actual paths in your bucket
  const defaultShipmentDocumentPaths = {
    'objection letter': 'b29a7ae5-9c6e-4864-b021-d53b00b5ca1c/b29a7ae5-9c6e-4864-b021-d53b00b5ca1c/Objection Letter Template.pdf', 
    'extension letter': 'b29a7ae5-9c6e-4864-b021-d53b00b5ca1c/b29a7ae5-9c6e-4864-b021-d53b00b5ca1c/Extension Request Letter.pdf', 
    'payment plan': 'b29a7ae5-9c6e-4864-b021-d53b00b5ca1c/b29a7ae5-9c6e-4864-b021-d53b00b5ca1c/Payment Plan Request Letter.pdf',
  };

  // Effect to update the selected document when shipment type changes
  useEffect(() => {
    const filePath = defaultShipmentDocumentPaths[shipmentType];
    console.log('Shipment type changed:', shipmentType);
    if (filePath) {
      setSelectedShipmentDocument({
        type: shipmentType,
        filePath: filePath, // Use the actual file path
      });
      console.log('Selected shipment document updated:', { type: shipmentType, filePath: filePath });
    } else {
      setSelectedShipmentDocument(null);
      console.log('Selected shipment document set to null.');
    }
  }, [shipmentType]);

  // Fetch outgoing emails from Supabase Storage when tab is active
  useEffect(() => {
    if (activeTab === 'outgoing-email') {
      const fetchOutgoingEmails = async () => {
        setLoadingOutgoingEmails(true);
        setOutgoingEmailsError(null);
        
        try {
          console.log('Starting to fetch outgoing emails...');
          // Get current user session
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw new Error('Authentication required');
          
          console.log('User session obtained, fetching from tables...');
          
                    // Fetch signed documents from kvk_signed_forms table only
          console.log('Fetching from kvk_signed_forms table...');
          const { data: kvkSignedForms, error: kvkError } = await supabase
            .from('kvk_signed_forms')
            .select('*')
            .eq('user_id', sessionData.session.user.id)
            .order('upload_date', { ascending: false });

          if (kvkError) {
            console.error('KVK signed forms error:', kvkError);
            throw kvkError;
          }

          console.log('KVK signed forms data received:', kvkSignedForms?.length || 0);
          
          // Format documents from kvk_signed_forms
          const allDocs = [];
          
          if (kvkSignedForms && kvkSignedForms.length > 0) {
            kvkSignedForms.forEach(doc => {
                              allDocs.push({
                  id: doc.id,
                  document_type: doc.form_type || 'Signed Document',
                  document_name: doc.form_type || 'Signed Document',
                  file_path: doc.file_path,
                  created_at: doc.upload_date || doc.created_at,
                  client_id: doc.user_id,
                  status: doc.status || 'uploaded',
                  signature_date: doc.upload_date || doc.created_at,
                  signer_name: doc.representative_id || 'Unknown',
                  document_hash: doc.file_hash || null,
                  company_name: doc.company_name || null,
                  tax_id: doc.tax_id || null,
                  vat_number: doc.vat_number || null,
                  kvk_number: doc.kvk_number || null,
                  issue_date: doc.issue_date || doc.upload_date,
                  due_date: doc.due_date || null,
                  amount: doc.amount || null,
                  currency: doc.currency || 'EUR',
                  document_category: doc.form_type || 'Signed Document',
                  priority_level: doc.priority_level || 'medium',
                  extracted_data: doc.extracted_data || {},
                  deadlines: doc.deadlines || [],
                  recommendations: doc.recommendations || [],
                  summary: doc.summary || '',
                  analyzed_at: doc.analyzed_at || null,
                  analysis_status: doc.analysis_status || 'pending',
                  notes: doc.notes || null,
                  tags: doc.tags || []
                });
            });
          }

          const data = allDocs;
          
          // Process the fetched data to match the desired display format
          const processedEmails = data.map(doc => ({
            id: doc.id,
            document_type: doc.document_type,
            document_name: doc.document_name,
            file_path: doc.file_path,
            created_at: doc.created_at,
            status: doc.status,
            signature_date: doc.signature_date,
            signer_name: doc.signer_name,
            document_hash: doc.document_hash,
            company_name: doc.company_name,
            tax_id: doc.tax_id,
            vat_number: doc.vat_number,
            kvk_number: doc.kvk_number,
            issue_date: doc.issue_date,
            due_date: doc.due_date,
            amount: doc.amount,
            currency: doc.currency,
            document_category: doc.document_category,
            priority_level: doc.priority_level,
            extracted_data: doc.extracted_data,
            deadlines: doc.deadlines,
            recommendations: doc.recommendations,
            summary: doc.summary,
            analyzed_at: doc.analyzed_at,
            analysis_status: doc.analysis_status,
            notes: doc.notes,
            tags: doc.tags,
            hasAnalysis: !!(doc.extracted_data || doc.deadlines || doc.recommendations || doc.summary)
          }));
          
          // Sort by created_at descending
          processedEmails.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          // If no documents found, show a helpful message
          if (processedEmails.length === 0) {
            console.log('No documents found in any table');
            // You could set a message here instead of empty array
            setOutgoingEmails([]);
          } else {
            console.log(`Successfully loaded ${processedEmails.length} documents`);
          setOutgoingEmails(processedEmails);
        }
        } catch (error) {
          console.error('Error fetching signed documents:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            stack: error.stack
          });
          setOutgoingEmailsError(error);
          setOutgoingEmails([]);
        }
        
        setLoadingOutgoingEmails(false);
      };

      fetchOutgoingEmails();
    }
  }, [activeTab]); // Rerun effect when activeTab changes

  // Add this useEffect for fetching incoming mail
  useEffect(() => {
    if (activeTab === 'incoming') {
      fetchIncomingMail();
    }
  }, [activeTab]);

  // Add event listener for refreshing outgoing emails after analysis
  useEffect(() => {
    const handleRefreshOutgoingEmails = () => {
      if (activeTab === 'outgoing-email') {
        // Refetch the data to show updated analysis status
        const fetchOutgoingEmails = async () => {
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw new Error('Authentication required');
            
            // Fetch signed documents from kvk_signed_forms table only
            const { data: kvkSignedForms, error: kvkError } = await supabase
              .from('kvk_signed_forms')
              .select('*')
              .eq('user_id', sessionData.session.user.id)
              .order('upload_date', { ascending: false });

            if (kvkError) throw kvkError;

            // Format documents from kvk_signed_forms
            const allDocs = [];
            
            if (kvkSignedForms && kvkSignedForms.length > 0) {
              kvkSignedForms.forEach(doc => {
                allDocs.push({
                  id: doc.id,
                  document_type: doc.form_type || 'Signed Document',
                  document_name: doc.form_type || 'Signed Document',
                  file_path: doc.file_path,
                  created_at: doc.upload_date || doc.created_at,
                  client_id: doc.user_id,
                  status: doc.status || 'uploaded',
                  signature_date: doc.upload_date || doc.created_at,
                  signer_name: doc.representative_id || 'Unknown',
                  document_hash: doc.file_hash || null,
                  company_name: doc.company_name || null,
                  tax_id: doc.tax_id || null,
                  vat_number: doc.vat_number || null,
                  kvk_number: doc.kvk_number || null,
                  issue_date: doc.issue_date || doc.upload_date,
                  due_date: doc.due_date || null,
                  amount: doc.amount || null,
                  currency: doc.currency || 'EUR',
                  document_category: doc.form_type || 'Signed Document',
                  priority_level: doc.priority_level || 'medium',
                  extracted_data: doc.extracted_data || {},
                  deadlines: doc.deadlines || [],
                  recommendations: doc.recommendations || [],
                  summary: doc.summary || '',
                  analyzed_at: doc.analyzed_at || null,
                  analysis_status: doc.analysis_status || 'pending',
                  notes: doc.notes || null,
                  tags: doc.tags || []
                });
              });
            }

            // Process the fetched data to match the desired display format
            const processedEmails = allDocs.map(doc => ({
              id: doc.id,
              document_type: doc.document_type,
              document_name: doc.document_name,
              file_path: doc.file_path,
              created_at: doc.created_at,
              status: doc.status,
              signature_date: doc.signature_date,
              signer_name: doc.signer_name,
              document_hash: doc.document_hash,
              company_name: doc.company_name,
              tax_id: doc.tax_id,
              vat_number: doc.vat_number,
              kvk_number: doc.kvk_number,
              issue_date: doc.issue_date,
              due_date: doc.due_date,
              amount: doc.amount,
              currency: doc.currency,
              document_category: doc.document_category,
              priority_level: doc.priority_level,
              extracted_data: doc.extracted_data,
              deadlines: doc.deadlines,
              recommendations: doc.recommendations,
              summary: doc.summary,
              analyzed_at: doc.analyzed_at,
              analysis_status: doc.analysis_status,
              notes: doc.notes,
              tags: doc.tags,
              hasAnalysis: !!(doc.extracted_data || doc.deadlines || doc.recommendations || doc.summary)
            }));
            
            // Sort by created_at descending
            processedEmails.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setOutgoingEmails(processedEmails);
          } catch (error) {
            console.error('Error refreshing outgoing emails:', error);
          }
        };
        
        fetchOutgoingEmails();
      }
    };

    window.addEventListener('refreshOutgoingEmails', handleRefreshOutgoingEmails);
    
    return () => {
      window.removeEventListener('refreshOutgoingEmails', handleRefreshOutgoingEmails);
    };
  }, [activeTab]);

  // Add useEffect to fetch channels when the component mounts
  useEffect(() => {
    fetchChannels();
  }, []);

  // Add useEffect to handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showShipmentTypeDropdown && !event.target.closest('.shipment-type-dropdown')) {
        setShowShipmentTypeDropdown(false);
      }
      if (showTemplatePreview && !event.target.closest('.template-preview-container')) {
        setShowTemplatePreview(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShipmentTypeDropdown, showTemplatePreview]);

  const fetchIncomingMail = async () => {
    try {
      setLoadingMail(true);
      setMailError(null);

      const { data, error } = await supabase
        .from('incoming_mails')
        .select(`
          id,
          document_name,
          document_type,
          issue_date,
          file_path,
          created_at,
          client_id,
          extracted_data,
          deadlines,
          recommendations,
          summary
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format the data to match the mail display structure with enhanced processing
      const formattedMail = data.map(mail => {
        // Process extracted data for display
        let extractedInfo = {};
        let priorityTags = [];
        
        if (mail.extracted_data) {
          try {
            const parsedData = typeof mail.extracted_data === 'string' 
              ? JSON.parse(mail.extracted_data) 
              : mail.extracted_data;
            
            extractedInfo = parsedData;
            
            // Extract key information for tags
            if (parsedData.amount) {
              priorityTags.push(`€${parsedData.amount}`);
            }
            if (parsedData.due_date) {
              priorityTags.push(`Due: ${new Date(parsedData.due_date).toLocaleDateString()}`);
            }
            if (parsedData.document_type) {
              priorityTags.push(parsedData.document_type);
            }
          } catch (e) {
            console.error('Error parsing extracted_data:', e);
          }
        }

        // Process deadlines for priority calculation
        let deadlinePriority = 'low';
        if (mail.deadlines) {
          try {
            const parsedDeadlines = typeof mail.deadlines === 'string' 
              ? JSON.parse(mail.deadlines) 
              : mail.deadlines;
            
            if (parsedDeadlines.length > 0) {
              const now = new Date();
              const earliestDeadline = parsedDeadlines.reduce((earliest, current) => {
                const currentDate = new Date(current.date || current.due_date);
                const earliestDate = new Date(earliest.date || earliest.due_date);
                return currentDate < earliestDate ? current : earliest;
              });
              
              const daysUntilDeadline = Math.ceil((new Date(earliestDeadline.date || earliestDeadline.due_date) - now) / (1000 * 60 * 60 * 24));
              
              if (daysUntilDeadline <= 7) deadlinePriority = 'high';
              else if (daysUntilDeadline <= 30) deadlinePriority = 'medium';
              else deadlinePriority = 'low';
            }
          } catch (e) {
            console.error('Error parsing deadlines:', e);
          }
        }

        return {
        id: mail.id,
          sender: mail.document_type,
          subject: mail.document_name,
        date: new Date(mail.created_at).toLocaleDateString(),
          tags: priorityTags,
          filePath: mail.file_path,
          extractedData: extractedInfo,
          deadlinePriority,
          hasAnalysis: !!(mail.extracted_data || mail.deadlines || mail.recommendations || mail.summary || mail.analyzed_at)
        };
      });

      setIncomingMail(formattedMail);
    } catch (error) {
      setMailError(error.message);
    } finally {
      setLoadingMail(false);
    }
  };

  // Handlers for Incoming Mail Actions
  const handleDownloadMail = async (mail) => {
    if (!mail.filePath) {
      alert('No file available for this mail.');
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from('mails-storage')
        .download(mail.filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = mail.subject;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading mail:', error.message);
      alert('Failed to download document: ' + error.message);
    }
  };

  const handleViewMail = async (mail) => {
    if (!mail.filePath) {
      alert('No file available for this mail.');
      return;
    }
    try {
      console.log('Opening document:', mail.subject, 'File path:', mail.filePath);
      
      // First try to get a signed URL which will work even for private buckets
      const { data: signedData, error: signedError } = await supabase.storage
        .from('mails-storage')
        .createSignedUrl(mail.filePath, 3600); // URL valid for 1 hour

      if (signedError) {
        console.log('Signed URL failed, trying public URL:', signedError);
        // If signed URL fails, try to get public URL as fallback
        const { data: publicData } = await supabase.storage
          .from('mails-storage')
          .getPublicUrl(mail.filePath);

        if (publicData?.publicUrl) {
          console.log('Opening document with public URL');
          window.open(publicData.publicUrl, '_blank', 'noopener,noreferrer');
          toast.success(`📄 Document "${mail.subject}" opened successfully!`);
        } else {
          throw new Error('Could not get URL for file');
        }
      } else {
        console.log('Opening document with signed URL');
        // Use the signed URL if available
        window.open(signedData.signedUrl, '_blank', 'noopener,noreferrer');
        toast.success(`📄 Document "${mail.subject}" opened successfully!`);
      }
    } catch (error) {
      console.error('❌ Error viewing mail:', error.message);
      toast.error(`Failed to open document "${mail.subject}". Please ensure you have proper permissions.`);
    }
  };

  const handleAnalyzeMail = async (mail) => {
    try {
      setAnalyzingDocument(mail.id);

      // Check if analysis already exists
      if (mail.hasAnalysis) {
        console.log('Analysis already exists for this mail');
        
    // Fetch detailed analysis data from Supabase
    const { data, error } = await supabase
      .from('incoming_mails')
      .select(`
        document_type, 
        summary, 
        deadlines, 
        recommendations, 
        document_name, 
        created_at,
        extracted_data,
        issue_date,
        file_path
      `)
      .eq('id', mail.id)
      .limit(1);

    if (error) {
      console.error('Error fetching analysis data from Supabase:', error);
      alert('Failed to fetch analysis data.');
          return;
        }

        if (data && data.length > 0) {
      const mailData = data[0];
      
      // Process extracted_data JSONB
      let extractedData = {};
      if (mailData.extracted_data) {
        try {
          extractedData = typeof mailData.extracted_data === 'string' 
            ? JSON.parse(mailData.extracted_data) 
            : mailData.extracted_data;
        } catch (e) {
          console.error('Error parsing extracted_data:', e);
          extractedData = {};
        }
      }

      // Process deadlines JSONB with priority calculation
      let processedDeadlines = [];
      if (mailData.deadlines) {
        try {
          const parsedDeadlines = typeof mailData.deadlines === 'string' 
            ? JSON.parse(mailData.deadlines) 
            : mailData.deadlines;
          
          processedDeadlines = parsedDeadlines.map(deadline => {
            const deadlineDate = new Date(deadline.date || deadline.due_date);
            const now = new Date();
            const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
            
            let priority = 'low';
            if (daysUntilDeadline <= 7) priority = 'high';
            else if (daysUntilDeadline <= 30) priority = 'medium';
            
            return {
              ...deadline,
              priority,
              daysUntilDeadline,
              isOverdue: daysUntilDeadline < 0
            };
              }).sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);
        } catch (e) {
          console.error('Error parsing deadlines:', e);
          processedDeadlines = [];
        }
      }

      // Process recommendations JSONB with categorization
      let processedRecommendations = [];
      if (mailData.recommendations) {
        try {
          const parsedRecommendations = typeof mailData.recommendations === 'string' 
            ? JSON.parse(mailData.recommendations) 
            : mailData.recommendations;
          
          processedRecommendations = parsedRecommendations.map(rec => {
            let category = 'General';
            let priority = 'medium';
            
            if (typeof rec === 'string') {
              const recLower = rec.toLowerCase();
              if (recLower.includes('tax') || recLower.includes('vat') || recLower.includes('payment')) {
                category = 'Financial';
                priority = 'high';
              } else if (recLower.includes('deadline') || recLower.includes('urgent') || recLower.includes('immediate')) {
                category = 'Administrative';
                priority = 'high';
              } else if (recLower.includes('penalty') || recLower.includes('fine')) {
                category = 'Penalty';
                priority = 'high';
              } else if (recLower.includes('review') || recLower.includes('check')) {
                category = 'Administrative';
                priority = 'medium';
              }
            } else if (rec.category) {
              category = rec.category;
              priority = rec.priority || 'medium';
            }
            
            return {
              text: typeof rec === 'string' ? rec : rec.text || rec.description || 'N/A',
              category,
              priority
            };
          });
        } catch (e) {
          console.error('Error parsing recommendations:', e);
          processedRecommendations = [];
        }
      }

      // Group recommendations by category
      const groupedRecommendations = processedRecommendations.reduce((groups, rec) => {
        if (!groups[rec.category]) {
          groups[rec.category] = [];
        }
        groups[rec.category].push(rec);
        return groups;
      }, {});

              setAnalyzedMail({
        ...mailData,
        extractedData,
        deadlines: processedDeadlines,
        recommendations: processedRecommendations,
        groupedRecommendations,
        documentMetadata: {
          name: mailData.document_name,
          type: mailData.document_type,
          issueDate: mailData.issue_date,
          createdAt: mailData.created_at,
          filePath: mailData.file_path
        }
        });
      setIsModalOpen(true);
          return;
        }
      }

      // If no analysis exists, call the oDoc analyzer API
      console.log('🚀 Starting oDoc analyzer API call for mail:', mail.id);
      console.log('📄 Document:', mail.subject);
      console.log('📁 File path:', mail.filePath);
      
      if (!mail.filePath) {
        throw new Error('No file path found for this mail');
      }
      
      // Get the file from storage - use mails-storage bucket
      console.log('📥 Downloading file from storage...');
      const { data: fileData, error: fileError } = await supabase.storage
        .from('mails-storage')
        .download(mail.filePath);

      if (fileError) {
        console.error('Error downloading file for analysis:', fileError);
        throw new Error('Failed to download file for analysis');
      }

      if (!fileData) {
        throw new Error('No file data received for analysis');
      }

      // Validate file before sending
      if (fileData.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size too large. Please select a file smaller than 10MB.');
      }

      // Log file details for debugging
      console.log('File details:', {
        name: fileData.name,
        size: fileData.size,
        type: fileData.type
      });

      // Create FormData and send file to oDoc analyzer API
      const formData = new FormData();
      formData.append("file", fileData);

      console.log('🌐 Sending request to oDoc analyzer API:', "https://odoc-analyser.onrender.com/analyze");
      console.log('📊 File details - Name:', fileData.name, 'Size:', fileData.size, 'Type:', fileData.type);
      
      const response = await axios.post(
        "https://odoc-analyser.onrender.com/analyze", 
        formData, 
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000, // 30 second timeout
        }
      );
      
      console.log('✅ oDoc analyzer API response received');
      console.log('📊 Response status:', response.status);
      console.log('📄 Response data:', response.data);
      
      const analysisResult = response.data;

      // Save analysis results to database - update incoming_mails table
      const { error: updateError } = await supabase
        .from('incoming_mails')
        .update({
          extracted_data: analysisResult.extracted_data || {},
          deadlines: analysisResult.deadlines || [],
          recommendations: analysisResult.recommendations || [],
          summary: analysisResult.summary || '',
          analyzed_at: new Date().toISOString(),
          analysis_status: 'completed'
        })
        .eq('id', mail.id);

      if (updateError) {
        console.error('Error saving analysis to database:', updateError);
        throw updateError;
      }

      // Process the analysis results for display
      let processedDeadlines = [];
      if (analysisResult.deadlines) {
        processedDeadlines = analysisResult.deadlines.map(deadline => {
          const deadlineDate = new Date(deadline.date || deadline.due_date);
          const now = new Date();
          const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
          
          let priority = 'low';
          if (daysUntilDeadline <= 7) priority = 'high';
          else if (daysUntilDeadline <= 30) priority = 'medium';
          
          return {
            ...deadline,
            priority,
            daysUntilDeadline,
            isOverdue: daysUntilDeadline < 0
          };
        }).sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);
      }

      let processedRecommendations = [];
      if (analysisResult.recommendations) {
        processedRecommendations = analysisResult.recommendations.map(rec => {
          let category = 'General';
          let priority = 'medium';
          
          if (typeof rec === 'string') {
            const recLower = rec.toLowerCase();
            if (recLower.includes('tax') || recLower.includes('vat') || recLower.includes('payment')) {
              category = 'Financial';
              priority = 'high';
            } else if (recLower.includes('deadline') || recLower.includes('urgent') || recLower.includes('immediate')) {
              category = 'Administrative';
              priority = 'high';
            } else if (recLower.includes('penalty') || recLower.includes('fine')) {
              category = 'Penalty';
              priority = 'high';
            } else if (recLower.includes('review') || recLower.includes('check')) {
              category = 'Administrative';
              priority = 'medium';
            }
          } else if (rec.category) {
            category = rec.category;
            priority = rec.priority || 'medium';
          }
          
          return {
            text: typeof rec === 'string' ? rec : rec.text || rec.description || 'N/A',
            category,
            priority
          };
        });
      }

      // Set the analyzed mail data for display
      setAnalyzedMail({
        id: mail.id,
        document_name: mail.subject,
        document_type: mail.sender,
        file_path: mail.filePath,
        extracted_data: analysisResult.extracted_data || {},
        deadlines: processedDeadlines,
        recommendations: processedRecommendations,
        summary: analysisResult.summary || '',
        createdAt: mail.date,
        filePath: mail.filePath
      });

      setIsModalOpen(true);
      
      // Show success message
      toast.success(`✅ Document "${mail.subject}" analyzed successfully!`);
      
      // Refresh the incoming mail list to show analysis status
      if (activeTab === 'incoming') {
        fetchIncomingMail();
      }

    } catch (err) {
      console.error('❌ Analysis error:', err);
      
      // Better error handling with toast notifications
      if (err.response) {
        // Server responded with error status
        console.error('Server error details:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });
        
        if (err.response.status === 500) {
          toast.error('Server error: The document analysis service is experiencing issues. Please try again later.');
        } else if (err.response.status === 413) {
          toast.error('File too large. Please select a smaller file.');
        } else if (err.response.status === 415) {
          toast.error('Unsupported file type. Please select a PDF, image, or document file.');
    } else {
          toast.error(`Server error (${err.response.status}): ${err.response.data?.message || err.response.statusText}`);
        }
      } else if (err.request) {
        // Request was made but no response received
        toast.error('No response from server. Please check your internet connection and try again.');
      } else {
        // Something else happened
        toast.error(`Error: ${err.message}`);
      }
    } finally {
      setAnalyzingDocument(null);
    }
  };

  // Handlers for Outgoing Email Actions
  const handleViewOutgoingEmail = async (email) => {
    if (!email.file_path) {
      alert('No file available for this document.');
      return;
    }
    try {
      // Use kvk-forms storage bucket
      const { data: signedData, error: signedError } = await supabase.storage
        .from('kvk-forms')
        .createSignedUrl(email.file_path, 3600);

      if (signedError) {
        // Try to get public URL from kvk-forms bucket
        const { data: publicData } = await supabase.storage
          .from('kvk-forms')
          .getPublicUrl(email.file_path);

        if (publicData?.publicUrl) {
          window.open(publicData.publicUrl, '_blank', 'noopener,noreferrer');
          return;
        } else {
          throw new Error('Could not get URL for file');
        }
      } else {
        window.open(signedData.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error viewing document:', error.message);
      alert('Failed to view document. Please ensure you have proper permissions.');
    }
  };

  const handleDownloadOutgoingEmail = async (email) => {
    if (!email.file_path) {
      alert('No file path available for this document.');
      return;
    }
    try {
      // Use kvk-forms storage bucket
      const { data, error } = await supabase.storage
        .from('kvk-forms')
        .download(email.file_path);

      if (error) {
        throw error;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = email.document_name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading document:', error.message);
      alert('Failed to download document: ' + error.message);
    }
  };

  const handleAnalyzeOutgoingEmail = async (email) => {
    try {
      setAnalyzingDocument(email.id);

      // Check if analysis already exists
      if (email.extracted_data && email.deadlines && email.recommendations && email.summary) {
        console.log('Analysis already exists for this document');
        
        // Set the analyzed mail data for display
        setAnalyzedMail({
          id: email.id,
          document_name: email.document_name,
          document_type: email.document_type,
          file_path: email.file_path,
          extracted_data: email.extracted_data,
          deadlines: email.deadlines,
          recommendations: email.recommendations,
          summary: email.summary,
          createdAt: email.created_at,
          filePath: email.file_path
        });

        setIsModalOpen(true);
        
        // Refresh the outgoing emails list to show analysis status
        if (activeTab === 'outgoing-email') {
          // Trigger a refresh of the data
          const event = new Event('refreshOutgoingEmails');
          window.dispatchEvent(event);
        }
        return;
      }

      // If no analysis exists, call the oDoc analyzer API
      console.log('Calling oDoc analyzer API for document:', email.id);
      
      if (!email.file_path) {
        throw new Error('No file path found for this document');
      }
      
      console.log('File path:', email.file_path);
      
      // Get the file from storage - use kvk-forms bucket
      const { data: fileData, error: fileError } = await supabase.storage
        .from('kvk-forms')
        .download(email.file_path);

      if (fileError) {
        console.error('Error downloading file for analysis:', fileError);
        throw new Error('Failed to download file for analysis');
      }

      if (!fileData) {
        throw new Error('No file data received for analysis');
      }

      // Validate file before sending
      if (fileData.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size too large. Please select a file smaller than 10MB.');
      }

      // Log file details for debugging
      console.log('File details:', {
        name: fileData.name,
        size: fileData.size,
        type: fileData.type
      });

      // Create FormData and send file directly - same as working handleAnalyze function
      const formData = new FormData();
      formData.append("file", fileData);

      console.log('Sending request to:', "https://odoc-analyser.onrender.com/analyze");
      
      // Use axios.post exactly like the working handleAnalyze function
      const response = await axios.post(
        "https://odoc-analyser.onrender.com/analyze", 
        formData, 
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000, // 30 second timeout
        }
      );
      
      console.log('Raw response:', response);
      console.log('Raw response data:', response.data);
      
      const analysisResult = response.data;

      // Save analysis results to database - update kvk_signed_forms table
      const { error: updateError } = await supabase
        .from('kvk_signed_forms')
        .update({
          extracted_data: analysisResult.extracted_data || {},
          deadlines: analysisResult.deadlines || [],
          recommendations: analysisResult.recommendations || [],
          summary: analysisResult.summary || '',
          analyzed_at: new Date().toISOString(),
          analysis_status: 'completed'
        })
        .eq('id', email.id);

      if (updateError) {
        console.error('Error saving analysis to database:', updateError);
        throw updateError;
      }

      // Process the analysis results for display
      let processedDeadlines = [];
      if (analysisResult.deadlines) {
        processedDeadlines = analysisResult.deadlines.map(deadline => {
          const deadlineDate = new Date(deadline.date || deadline.due_date);
          const now = new Date();
          const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
          
          let priority = 'low';
          if (daysUntilDeadline <= 7) priority = 'high';
          else if (daysUntilDeadline <= 30) priority = 'medium';
          
          return {
            ...deadline,
            priority,
            daysUntilDeadline,
            isOverdue: daysUntilDeadline < 0
          };
        }).sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);
      }

      let processedRecommendations = [];
      if (analysisResult.recommendations) {
        processedRecommendations = analysisResult.recommendations.map(rec => {
          let category = 'General';
          let priority = 'medium';
          
          if (typeof rec === 'string') {
            const recLower = rec.toLowerCase();
            if (recLower.includes('tax') || recLower.includes('vat') || recLower.includes('payment')) {
              category = 'Financial';
              priority = 'high';
            } else if (recLower.includes('deadline') || recLower.includes('urgent') || recLower.includes('immediate')) {
              category = 'Administrative';
              priority = 'high';
            } else if (recLower.includes('penalty') || recLower.includes('fine')) {
              category = 'Penalty';
              priority = 'high';
            } else if (recLower.includes('review') || recLower.includes('check')) {
              category = 'Administrative';
              priority = 'medium';
            }
          } else if (rec.category) {
            category = rec.category;
            priority = rec.priority || 'medium';
          }
          
          return {
            text: typeof rec === 'string' ? rec : rec.text || rec.description || 'N/A',
            category,
            priority
          };
        });
      }

      // Set the analyzed mail data for display
        setAnalyzedMail({
        id: email.id,
        document_name: email.document_name,
        document_type: email.document_type,
        file_path: email.file_path,
        extracted_data: analysisResult.extracted_data || {},
        deadlines: processedDeadlines,
        recommendations: processedRecommendations,
        summary: analysisResult.summary || '',
        createdAt: email.created_at,
        filePath: email.file_path
      });

        setIsModalOpen(true);
      
      // Refresh the outgoing emails list to show analysis status
      if (activeTab === 'outgoing-email') {
        // Trigger a refresh of the data
        const event = new Event('refreshOutgoingEmails');
        window.dispatchEvent(event);
      }

    } catch (err) {
      console.error('Analysis error:', err);
      
      // Better error handling - same as working handleAnalyze function
      if (err.response) {
        // Server responded with error status
        console.error('Server error details:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });
        
        if (err.response.status === 500) {
          alert('Server error: The document analysis service is experiencing issues. Please try again later.');
        } else if (err.response.status === 413) {
          alert('File too large. Please select a smaller file.');
        } else if (err.response.status === 415) {
          alert('Unsupported file type. Please select a PDF, image, or document file.');
      } else {
          alert(`Server error (${err.response.status}): ${err.response.data?.message || err.response.statusText}`);
        }
      } else if (err.request) {
        // Request was made but no response received
        alert('No response from server. Please check your internet connection and try again.');
      } else {
        // Something else happened
        alert(`Error: ${err.message}`);
      }
    } finally {
      setAnalyzingDocument(null);
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error('Not authenticated');

      const documents = selectedFile?.files || [];
      
      const shipmentData = {
        client_id: sessionData.session.user.id,
        recipient_name: recipientName,
        recipient_address: recipientAddress,
        shipment_type: shipmentType,
        contents: shipmentContents,
        delivery_method: deliveryMethod,
        tracking,
        delivery_confirmation: deliveryConfirmation,
        insurance,
        scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null,
        status: 'Pending',
        documents: documents // Save the documents array directly
      };

      const { data, error } = await supabase
        .from('shipments')
        .insert([shipmentData])
        .select();

      if (error) throw error;

      // Update the local shipments state with the new data
      setShipments(prevShipments => [{
        id: data[0].id,
        recipient: data[0].recipient_name,
        address: data[0].recipient_address,
        type: data[0].shipment_type,
        contents: data[0].contents,
        deliveryMethod: data[0].delivery_method,
        tracking: data[0].tracking,
        deliveryConfirmation: data[0].delivery_confirmation,
        insurance: data[0].insurance,
        scheduledDate: data[0].scheduled_date 
          ? new Date(data[0].scheduled_date).toLocaleDateString()
          : 'Not scheduled',
        status: data[0].status,
        documents: documents // Include documents in local state
      }, ...prevShipments]);

      // Clear form
      setShipmentType('Objection Letter');
      setRecipientName('');
      setRecipientAddress('');
      setShipmentContents('');
      setDeliveryMethod('Standard');
      setTracking(false);
      setDeliveryConfirmation(false);
      setInsurance(false);
      setScheduledDate(null);
      setSelectedFile(null);

      alert('Shipment created successfully!');
    } catch (error) {
      console.error('Error creating shipment:', error);
      alert(error.message === 'Not authenticated' 
        ? 'Please log in to create a shipment' 
        : 'Error creating shipment: ' + error.message
      );
    }
  };

  // Handlers for the document actions in Prepare Shipment tab
  const handleViewShipmentDocument = () => {
    let docUrl = '';
    switch (shipmentType) {
      case 'Objection Letter':
        docUrl = '/src/Objection Letter Template.docx'; // Use local file path
        break;
      case 'Extension Letter':
        docUrl = 'https://docs.google.com/document/d/1kqJZ6J5iePgnx9QJlZ0XZE-zjScUROhFb2R1kriwvGs/edit?usp=sharing';
        break;
      case 'Payment Plan Request Letter':
        docUrl = 'https://docs.google.com/document/d/1Nhz-8mv3qyz-6TDizICNBPENgPPxF7lSoOk5A_pVQ_o/edit?usp=sharing';
        break;
      default:
        console.error('Unknown shipment type:', shipmentType);
        return;
    }
    window.open(docUrl, '_blank');
  };

  const handleDownloadShipmentDocument = () => {
    let docUrl = '';
    let docType = '';
    
    switch (shipmentType) {
      case 'Objection Letter':
        // For Objection Letter, copy to clipboard instead of downloading
        // This is completely separate from shipment creation
        copyObjectionLetterTemplateOnly();
        return;
      case 'Extension Letter':
        // For Extension Letter, copy to clipboard instead of downloading
        // This is completely separate from shipment creation
        copyExtensionLetterTemplateOnly();
        return;
      case 'Payment Plan Request Letter':
        // For Payment Plan Request Letter, copy to clipboard instead of downloading
        // This is completely separate from shipment creation
        copyPaymentPlanRequestLetterTemplateOnly();
        return;
      default:
        console.error('Unknown shipment type:', shipmentType);
        return;
    }
    
    // This section is now unreachable since all cases return early
    // But keeping it for future document types that might need actual downloading
    if (docUrl) {
      // Create a download link for the document
      const link = document.createElement('a');
      link.href = docUrl;
      link.download = `${docType}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Completely separate function for copying Objection Letter Template - NO SHIPMENT INVOLVEMENT
  const copyObjectionLetterTemplateOnly = async () => {
    try {
      console.log('=== COPYING OBJECTION LETTER TEMPLATE - NO SHIPMENT INVOLVEMENT ===');
      console.log('This function is COMPLETELY SEPARATE from shipment creation');
      console.log('No database operations, no form submissions, no state changes');
      
      // IMPORTANT: This function should NEVER create shipments or modify any shipment state
      // It only copies text to clipboard - nothing else!
      
      // Get company details from corporate analysis if available
      let companyName = 'Your Company Name';
      let fiscalYear = new Date().getFullYear();
      let rsinNumber = 'Your RSIN Number';
      let kvkNumber = 'Your KVK Number';
      let companyAddress = 'Your Company Address';
      let companyPhone = 'Your Company Phone';
      let companyEmail = 'Your Company Email';
      let companyType = 'Your Company Type';
      let representativeName = 'Your Name';
      let representativePosition = 'Your Position';
      
      if (corporateAnalysis) {
        companyName = corporateAnalysis.company_name || companyName;
        fiscalYear = corporateAnalysis.fiscal_year || fiscalYear;
        console.log('Using company details from analysis:', { companyName, fiscalYear });
      }
      
      if (userProfile) {
        // Map user profile data to template variables
        companyName = userProfile.company_name || userProfile.name || companyName;
        companyAddress = userProfile.address || userProfile.registered_address || userProfile.base_location || companyAddress;
        companyPhone = userProfile.phone || companyPhone;
        companyEmail = userProfile.email || companyEmail;
        companyType = userProfile.company_type || userProfile.legal_form || companyType;
        representativeName = userProfile.name || userProfile.contact_name || representativeName;
        representativePosition = userProfile.position || userProfile.title || representativePosition;
        
        // Get RSIN/KVK from various possible sources
        rsinNumber = userProfile.rsin || userProfile.tax_id || userProfile.vat_number || rsinNumber;
        kvkNumber = userProfile.kvk_number || userProfile.reg_number || userProfile.chamber_number || kvkNumber;
        
        console.log('Using enhanced company details from user profile:', {
          companyName, companyAddress, companyPhone, companyEmail, 
          companyType, representativeName, representativePosition, rsinNumber, kvkNumber
        });
      }

      // Create the objection letter template with company mapping
      const objectionLetterTemplate = `Objection Letter Template: Corporate Tax Assessment ${fiscalYear}
[Company Letterhead]
Belastingdienst
[Relevant Tax Office Address]
[Postal Code and City]
The Netherlands
Date: [Insert Date]
Subject: Notice of Objection (Bezwaarschrift) - Corporate Tax Assessment ${fiscalYear}
Tax Reference Number: [Insert Reference Number]
RSIN/KVK Number: ${rsinNumber}/${kvkNumber}
Tax Year: ${fiscalYear}
Assessment Date: [Insert Date of Assessment]

Dear Sir/Madam,

1. Formal Notice of Objection
In accordance with Article 6:4 of the General Administrative Law Act (Algemene wet bestuursrecht) and Article 26 of the General State Taxes Act (Algemene wet inzake rijksbelastingen), I hereby formally submit an objection to the corporate tax assessment referenced above, issued on [date of assessment].

2. Company Details
Legal Name: ${companyName}
Trading Name: [If different from legal name]
Legal Form: ${companyType}
Address: ${companyAddress}
RSIN: ${rsinNumber}
KVK Number: ${kvkNumber}
Authorized Representative: ${representativeName} - ${representativePosition}
Contact Information: ${companyPhone}, ${companyEmail}

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
${representativeName}
${representativePosition}
${companyName}

Enclosures:
1. [List of enclosed documents]
2. [Power of attorney, if applicable]

________________________________________
Note: This objection letter has been filed within the statutory period of six weeks from the date of the assessment, as required by Article 6:7 of the General Administrative Law Act.`;

      console.log('Template created, now copying to clipboard...');
      
      // Copy to clipboard using the modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(objectionLetterTemplate);
        console.log('Template copied to clipboard successfully using modern API');
      } else {
        // Fallback for older browsers or non-secure contexts
        console.log('Using fallback clipboard method');
        const textArea = document.createElement('textarea');
        textArea.value = objectionLetterTemplate;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Template copied to clipboard using fallback method');
      }
      
      console.log('=== TEMPLATE COPYING COMPLETE - NO SHIPMENTS CREATED ===');
      console.log('Function completed successfully without any side effects');
      
      // Show success message - NO SHIPMENT CREATION
      alert('✅ Objection Letter Template copied to clipboard!\n\n📋 The template has been copied with your company details mapped in.\n\n💡 You can now paste it into any document editor and customize it further.\n\n⚠️ IMPORTANT: This action does NOT create any shipment or database record.\n\n🚚 To create a shipment: Fill out the form below and click "Create Shipment".');
      
    } catch (error) {
      console.error('=== ERROR IN COPYING TEMPLATE ===');
      console.error('Error copying template to clipboard:', error);
      console.error('This error is NOT related to shipment creation');
      console.error('No shipments were created during this process');
      alert('❌ Failed to copy template to clipboard. Please try again or manually copy the template.\n\nError: ' + error.message);
    }
  };

  // Completely separate function for copying Extension Letter Template - NO SHIPMENT INVOLVEMENT
  const copyExtensionLetterTemplateOnly = async () => {
    try {
      console.log('=== COPYING EXTENSION LETTER TEMPLATE - NO SHIPMENT INVOLVEMENT ===');
      console.log('This function is COMPLETELY SEPARATE from shipment creation');
      console.log('No database operations, no form submissions, no state changes');
      
      // IMPORTANT: This function should NEVER create shipments or modify any shipment state
      // It only copies text to clipboard - nothing else!
      
      // Get company details from corporate analysis if available
      let companyName = 'Your Company Name';
      let fiscalYear = new Date().getFullYear();
      let rsinNumber = 'Your RSIN Number';
      let kvkNumber = 'Your KVK Number';
      let companyAddress = 'Your Company Address';
      let companyPhone = 'Your Company Phone';
      let companyEmail = 'Your Company Email';
      let companyType = 'Your Company Type';
      let representativeName = 'Your Name';
      let representativePosition = 'Your Position';
      
      if (corporateAnalysis) {
        companyName = corporateAnalysis.company_name || companyName;
        fiscalYear = corporateAnalysis.fiscal_year || fiscalYear;
        console.log('Using company details from analysis:', { companyName, fiscalYear });
      }
      
      if (userProfile) {
        // Map user profile data to template variables
        companyName = userProfile.company_name || userProfile.name || companyName;
        companyAddress = userProfile.address || userProfile.registered_address || userProfile.base_location || companyAddress;
        companyPhone = userProfile.phone || companyPhone;
        companyEmail = userProfile.email || companyEmail;
        companyType = userProfile.company_type || userProfile.legal_form || companyType;
        representativeName = userProfile.name || userProfile.contact_name || representativeName;
        representativePosition = userProfile.position || userProfile.title || representativePosition;
        
        // Get RSIN/KVK from various possible sources
        rsinNumber = userProfile.rsin || userProfile.tax_id || userProfile.vat_number || rsinNumber;
        kvkNumber = userProfile.kvk_number || userProfile.reg_number || userProfile.chamber_number || kvkNumber;
        
        console.log('Using enhanced company details from user profile for Extension Letter:', {
          companyName, companyAddress, companyPhone, companyEmail, 
          companyType, representativeName, representativePosition, rsinNumber, kvkNumber
        });
      }

      // Create the extension letter template with company mapping
      const extensionLetterTemplate = `Extension Request Letter: Corporate Tax Filing ${fiscalYear}
[Company Letterhead]
Belastingdienst
[Relevant Tax Office Address]
[Postal Code and City]
The Netherlands
Date: [Insert Date]
Subject: Request for Extension of Filing Period - Corporate Tax Return ${fiscalYear}
RSIN/KVK Number: ${rsinNumber}/${kvkNumber}
Tax Reference Number: [Insert Reference Number]
Tax Year: ${fiscalYear}
Current Filing Deadline: [Insert Current Deadline]

Dear Sir/Madam,

1. Formal Request for Extension
Pursuant to Article 9 of the General State Taxes Act (Algemene wet inzake rijksbelastingen), I hereby respectfully request an extension of the filing period for our corporate tax return (aangifte vennootschapsbelasting) for the fiscal year ${fiscalYear}.

2. Company Details
Legal Name: ${companyName}
Trading Name: [If different from legal name]
Legal Form: ${companyType}
Address: ${companyAddress}
RSIN: ${rsinNumber}
KVK Number: ${kvkNumber}
Authorized Representative: ${representativeName} - ${representativePosition}
Contact Information: ${companyPhone}, ${companyEmail}

3. Extension Details
3.1 Current and Requested Deadlines
● Current filing deadline: [e.g., "31 May ${fiscalYear + 1}"]
● Requested extended deadline: [e.g., "1 November ${fiscalYear + 1}"]
● Extension period requested: [e.g., "5 months"]

3.2 Grounds for Extension Request
We are requesting this extension for the following reason(s):
[Select and elaborate on relevant reasons, for example:]

1. Complex financial transactions
Our company has undergone several complex financial transactions during the ${fiscalYear} fiscal year, including [briefly describe transactions, e.g., "a cross-border restructuring," "acquisition of three subsidiaries," etc.]. These transactions require thorough analysis and proper tax treatment to ensure accurate reporting.

2. Implementation of new financial system
We are currently implementing a new financial reporting system that will improve our tax compliance processes. The transition period overlaps with the tax return preparation period, creating temporary resource constraints.

3. Key personnel changes
Our financial department has experienced significant personnel changes, including [briefly describe, e.g., "the departure of our CFO," "restructuring of our tax team," etc.]. Additional time is needed to ensure proper knowledge transfer and accurate preparation of the tax return.

4. Pending clarification on tax position
We are awaiting clarification on [specific tax matter, e.g., "the application of the participation exemption to a specific investment," "the tax treatment of specific R&D expenses under the innovation box regime," etc.]. This clarification is essential for the accurate completion of our tax return.

5. Awaiting third-party information
We are currently awaiting essential information from [third party, e.g., "foreign subsidiaries," "joint venture partners," etc.] that is necessary for the accurate completion of our tax return.

4. Commitment to Compliance
We wish to emphasize our commitment to full compliance with Dutch tax regulations. This extension request is made solely to ensure the accuracy and completeness of our tax return. We assure you that we are actively working on preparing our corporate tax return and will submit it before the requested extended deadline.

5. Provisional Tax Assessment
We understand that this extension request does not affect any provisional tax assessment (voorlopige aanslag) that has been or will be imposed. We confirm that any such provisional assessment will be paid according to the stipulated schedule.

6. Request for Confirmation
We kindly request written confirmation of this extension to maintain proper documentation of our compliance efforts. Please send confirmation to [email address] or to our company address as listed above.

Should you require any additional information to process this request, please do not hesitate to contact [contact person] at [phone number] or [email address].

Thank you for your consideration of this request.

Yours faithfully,

[Signature]
${representativeName}
${representativePosition}
${companyName}

________________________________________
Note: This extension request is being submitted before the current filing deadline, in accordance with the requirements of the Dutch Tax Administration.`;

      console.log('Extension letter template created, now copying to clipboard...');
      
      // Copy to clipboard using the modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(extensionLetterTemplate);
        console.log('Extension letter template copied to clipboard successfully using modern API');
      } else {
        // Fallback for older browsers or non-secure contexts
        console.log('Using fallback clipboard method for extension letter');
        const textArea = document.createElement('textarea');
        textArea.value = extensionLetterTemplate;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Extension letter template copied to clipboard using fallback method');
      }
      
      console.log('=== EXTENSION LETTER TEMPLATE COPYING COMPLETE - NO SHIPMENTS CREATED ===');
      console.log('Function completed successfully without any side effects');
      
      // Show success message - NO SHIPMENT CREATION
      alert('✅ Extension Request Letter Template copied to clipboard!\n\n📋 The template has been copied with your company details mapped in.\n\n💡 You can now paste it into any document editor and customize it further.\n\n⚠️ IMPORTANT: This action does NOT create any shipment or database record.\n\n🚚 To create a shipment: Fill out the form below and click "Create Shipment".');
      
    } catch (error) {
      console.error('=== ERROR IN COPYING EXTENSION LETTER TEMPLATE ===');
      console.error('Error copying extension letter template to clipboard:', error);
      console.error('This error is NOT related to shipment creation');
      console.error('No shipments were created during this process');
      alert('❌ Failed to copy extension letter template to clipboard. Please try again or manually copy the template.\n\nError: ' + error.message);
    }
  };

  // Completely separate function for copying Payment Plan Request Letter Template - NO SHIPMENT INVOLVEMENT
  const copyPaymentPlanRequestLetterTemplateOnly = async () => {
    try {
      console.log('=== COPYING PAYMENT PLAN REQUEST LETTER TEMPLATE - NO SHIPMENT INVOLVEMENT ===');
      console.log('This function is COMPLETELY SEPARATE from shipment creation');
      console.log('No database operations, no form submissions, no state changes');
      
      // IMPORTANT: This function should NEVER create shipments or modify any shipment state
      // It only copies text to clipboard - nothing else!
      
      // Get company details from corporate analysis if available
      let companyName = 'Your Company Name';
      let fiscalYear = new Date().getFullYear();
      let rsinNumber = 'Your RSIN Number';
      let kvkNumber = 'Your KVK Number';
      let companyAddress = 'Your Company Address';
      let companyPhone = 'Your Company Phone';
      let companyEmail = 'Your Company Email';
      let companyType = 'Your Company Type';
      let representativeName = 'Your Name';
      let representativePosition = 'Your Position';
      
      if (corporateAnalysis) {
        companyName = corporateAnalysis.company_name || companyName;
        fiscalYear = corporateAnalysis.fiscal_year || fiscalYear;
        console.log('Using company details from analysis:', { companyName, fiscalYear });
      }
      
      if (userProfile) {
        // Map user profile data to template variables
        companyName = userProfile.company_name || userProfile.name || companyName;
        companyAddress = userProfile.address || userProfile.registered_address || userProfile.base_location || companyAddress;
        companyPhone = userProfile.phone || companyPhone;
        companyEmail = userProfile.email || companyEmail;
        companyType = userProfile.company_type || userProfile.legal_form || companyType;
        representativeName = userProfile.name || userProfile.contact_name || representativeName;
        representativePosition = userProfile.position || userProfile.title || representativePosition;
        
        // Get RSIN/KVK from various possible sources
        rsinNumber = userProfile.rsin || userProfile.tax_id || userProfile.vat_number || rsinNumber;
        kvkNumber = userProfile.kvk_number || userProfile.reg_number || userProfile.chamber_number || kvkNumber;
        
        console.log('Using enhanced company details from user profile for Payment Plan Request Letter:', {
          companyName, companyAddress, companyPhone, companyEmail, 
          companyType, representativeName, representativePosition, rsinNumber, kvkNumber
        });
      }

      // Create the payment plan request letter template with company mapping
      const paymentPlanRequestLetterTemplate = `Payment Plan Request Letter: Corporate Tax ${fiscalYear}
[Company Letterhead]
Belastingdienst
[Relevant Tax Office Address]
[Postal Code and City]
The Netherlands
Date: [Insert Date]
Subject: Request for Payment Plan (Betalingsregeling) - Corporate Tax ${fiscalYear}
RSIN/KVK Number: ${rsinNumber}/${kvkNumber}
Tax Reference Number: [Insert Reference Number]
Tax Year: ${fiscalYear}
Assessment Date: [Insert Date of Assessment]
Assessment Amount: €[Insert Amount]
Due Date: [Insert Current Payment Deadline]

Dear Sir/Madam,

1. Formal Request for Payment Plan
Pursuant to Article 25 of the Tax Collection Act (Invorderingswet), I am writing to formally request a payment plan for our corporate tax assessment for the fiscal year ${fiscalYear}. Due to temporary liquidity constraints, we are unable to pay the full assessment amount by the due date, but we remain fully committed to meeting our tax obligations through a structured payment arrangement.

2. Company Details
Legal Name: ${companyName}
Trading Name: [If different from legal name]
Legal Form: ${companyType}
Address: ${companyAddress}
RSIN: ${rsinNumber}
KVK Number: ${kvkNumber}
Authorized Representative: ${representativeName} - ${representativePosition}
Contact Information: ${companyPhone}, ${companyEmail}

3. Current Financial Situation
Our company is currently experiencing temporary liquidity constraints due to the following circumstances:
[Select and elaborate on relevant factors, for example:]

Our business has faced unexpected cash flow challenges in recent months due to a combination of factors that have significantly impacted our immediate liquidity position. We have experienced delayed payments from several key clients, with outstanding receivables currently totaling €[Amount]. Additionally, we have recently invested €[Amount] in essential equipment upgrades to maintain operational efficiency, which has temporarily strained our available cash reserves.

Despite these challenges, our business fundamentals remain strong. Our order book for the coming quarters shows promising growth, with confirmed contracts valued at €[Amount]. Our financial projections indicate that our cash flow situation will improve substantially by [Month/Year] as these projects progress and receivables are collected.

We have already implemented several measures to address our liquidity situation, including:
● Negotiating extended payment terms with suppliers
● Implementing stricter receivables collection procedures
● Reducing non-essential operational expenses
● [Any other relevant measures]

These actions, combined with our proposed payment plan, will enable us to meet our tax obligations while managing our temporary cash flow constraints.

4. Proposed Payment Plan
We respectfully propose the following payment plan for the corporate tax assessment of €[Total Amount]:
● Initial payment of €[Amount] by [Date]
● [Number] monthly installments of €[Amount] each, payable on the [Day] of each month, starting [Date]
● Final payment of €[Amount] by [Date]

This payment schedule will allow us to fulfill our tax obligation in full by [End Date], while managing our current liquidity constraints. We understand that statutory interest (invorderingsrente) will apply to the outstanding amount during the payment plan period, and we accept this condition.

5. Supporting Documentation
To substantiate our request and demonstrate our financial situation, we have attached the following documents:
1. Recent financial statements showing our current liquidity position
2. Cash flow projections for the next [Number] months
3. Overview of accounts receivable aging
4. [Any other relevant financial documentation]

These documents provide a transparent view of our current financial situation and support the necessity of our payment plan request.

6. Commitment to Compliance
We wish to emphasize our strong commitment to meeting our tax obligations and maintaining good standing with the Belastingdienst. Our company has a history of timely tax compliance, as evidenced by our payment record for previous years. This request is made solely due to temporary liquidity constraints, and we are taking all necessary measures to strengthen our financial position.

7. Request for Confirmation
We kindly request written confirmation of this payment plan to ensure proper documentation and compliance. Please send confirmation to [email address] or to our company address as listed above.

Should you require any additional information or documentation to process this request, please contact [contact person] at [phone number] or [email address]. We are available to discuss any aspects of this request or to provide further clarification as needed.

Thank you for your consideration of our request. We appreciate your understanding during this temporary financial challenge.

Yours faithfully,

[Signature]
${representativeName}
${representativePosition}
${companyName}

Enclosures:
1. [List of enclosed documents]
2. [Power of attorney, if applicable]

________________________________________
Note: This payment plan request is being submitted in accordance with the guidelines of the Dutch Tax Administration for businesses experiencing temporary financial difficulties.`;

      console.log('Payment plan request letter template created, now copying to clipboard...');
      
      // Copy to clipboard using the modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(paymentPlanRequestLetterTemplate);
        console.log('Payment plan request letter template copied to clipboard successfully using modern API');
      } else {
        // Fallback for older browsers or non-secure contexts
        console.log('Using fallback clipboard method for payment plan request letter');
        const textArea = document.createElement('textarea');
        textArea.value = paymentPlanRequestLetterTemplate;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Payment plan request letter template copied to clipboard using fallback method');
      }
      
      console.log('=== PAYMENT PLAN REQUEST LETTER TEMPLATE COPYING COMPLETE - NO SHIPMENTS CREATED ===');
      console.log('Function completed successfully without any side effects');
      
      // Show success message - NO SHIPMENT CREATION
      alert('✅ Payment Plan Request Letter Template copied to clipboard!\n\n📋 The template has been copied with your company details mapped in.\n\n💡 You can now paste it into any document editor and customize it further.\n\n⚠️ IMPORTANT: This action does NOT create any shipment or database record.\n\n🚚 To create a shipment: Fill out the form below and click "Create Shipment".');
      
    } catch (error) {
      console.error('=== ERROR IN COPYING PAYMENT PLAN REQUEST LETTER TEMPLATE ===');
      console.error('Error copying payment plan request letter template to clipboard:', error);
      console.error('This error is NOT related to shipment creation');
      console.error('No shipments were created during this process');
      alert('❌ Failed to copy payment plan request letter template to clipboard. Please try again or manually copy the template.\n\nError: ' + error.message);
    }
  };

  // Update the handleUploadShipmentDocument function
  const handleUploadShipmentDocument = async (e) => {
    e.preventDefault();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.doc,.docx';
    fileInput.multiple = true;
    
    fileInput.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      try {
        setUploading(true);
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error('Authentication required');
        
        const userId = sessionData.session.user.id;
        
        // Upload all files
        const uploadedDocs = await Promise.all(files.map(async (file) => {
          const fileName = `${Date.now()}_${file.name}`;
          const filePath = `${userId}/${fileName}`; // Simplified path structure

          const { error: uploadError } = await supabase.storage
            .from('shipment-docs')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          return {
            name: file.name,
            path: filePath, // This is important for retrieval
            type: file.type
          };
        }));

        // Store the uploaded documents info
        setSelectedFile({
          files: uploadedDocs
        });
        
        alert(`${files.length} document(s) uploaded successfully!`);
        
      } catch (error) {
        console.error('Error uploading documents:', error);
        alert('Error uploading documents: ' + error.message);
      } finally {
        setUploading(false);
      }
    };

    fileInput.click();
  };

  // Add this useEffect to fetch shipments when the tab changes
  useEffect(() => {
    if (activeTab === 'shipments') {
      fetchShipments();
    }
  }, [activeTab]);

  // Add useEffect to fetch corporate tax analysis when the tab changes
  useEffect(() => {
    if (activeTab === 'corporate-tax' || activeTab === 'corporate-analysis') {
      fetchCorporateTaxAnalysis();
    }
  }, [activeTab]);

  // Add useEffect to fetch user profile data when component mounts
  useEffect(() => {
    const fetchUserProfileData = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) return;
        
        const currentUserId = sessionData.session.user.id;
        await fetchUserProfile(currentUserId);
      } catch (error) {
        console.warn('Could not fetch user profile data:', error.message);
      }
    };

    fetchUserProfileData();
  }, []);

  // Add the fetchShipments function
  const fetchShipments = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error('Authentication required');

      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('client_id', sessionData.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedShipments = data.map(shipment => ({
        id: shipment.id,
        recipient: shipment.recipient_name,
        address: shipment.recipient_address,
        type: shipment.shipment_type,
        contents: shipment.contents,
        deliveryMethod: shipment.delivery_method,
        tracking: shipment.tracking,
        deliveryConfirmation: shipment.delivery_confirmation,
        insurance: shipment.insurance,
        scheduledDate: shipment.scheduled_date 
          ? new Date(shipment.scheduled_date).toLocaleDateString()
          : 'Not scheduled',
        status: shipment.status,
        documents: shipment.documents || [] // Ensure documents are included
      }));

      setShipments(formattedShipments);
    } catch (error) {
      console.error('Error fetching shipments:', error);
      alert('Error loading shipments: ' + error.message);
    }
  };

  // Add this helper function for status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return '#4CAF50';
      case 'In Transit':
        return '#FFB300';
      case 'Cancelled':
        return '#FF5252';
      case 'Pending':
      default:
        return '#6C5DD3';
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '€0.00';
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[€,\s]/g, '')) : amount;
    
    if (isNaN(numAmount)) return '€0.00';
    
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  // Create Channel form handlers
  const handleChannelFormChange = (e) => {
    const { name, value } = e.target;
    setChannelFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateChannel = async () => {
    try {
      // Get the current user session
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        console.error('User is not authenticated');
        setSuccessMessage('You must be logged in to create a channel.');
        setTimeout(() => setSuccessMessage(''), 3000);
        return;
      }

      // Prepare the channel data for Supabase
      const newChannel = {
        title: channelFormData.title,
        process_type: channelFormData.processType,
        priority: channelFormData.priority,
        due_date: channelFormData.dueDate || null,
        detect_by_reference: channelFormData.detectByReference || null,
        tax_id_rsin: channelFormData.taxIdRsin || null,
        company_name: channelFormData.companyName || null,
        user_id: sessionData.session.user.id,
        description: `Channel for ${channelFormData.processType} process`
      };

      console.log('Creating channel:', newChannel);

      // Insert the new channel into the "channels" table
      const { data, error } = await supabase.from('channels').insert([newChannel]);

      if (error) {
        console.error('Supabase Insert Error:', error);
        setSuccessMessage('Failed to create channel. Please try again.');
        setTimeout(() => setSuccessMessage(''), 3000);
        return;
      }

      console.log('Channel created successfully:', data);

      // Close modal and reset form
      setShowCreateChannelModal(false);
      setChannelFormData({
        title: '',
        processType: 'Corporate Tax',
        priority: 'Normal',
        dueDate: '',
        detectByReference: '',
        taxIdRsin: '',
        companyName: 'Acme Holdings B.V.'
      });

      // Show success message
      setSuccessMessage('Channel created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Refresh the channels list
      await fetchChannels();

    } catch (error) {
      console.error('Error creating channel:', error);
      setSuccessMessage('Failed to create channel. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handlePreviewChannel = () => {
    console.log('Previewing channel:', channelFormData);
    // Here you could show a preview modal or navigate to a preview page
  };

  // Fetch channels from Supabase
  const fetchChannels = async () => {
    try {
      setLoadingChannels(true);
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        console.error('No user session found');
        return;
      }

      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching channels:', error);
        return;
      }

      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Add these functions before the return statement
  const handleViewShipmentDoc = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('shipment-docs')
        .createSignedUrl(doc.path, 3600); // URL valid for 1 hour

      if (error) {
        const { data: publicData } = await supabase.storage
          .from('shipment-docs')
          .getPublicUrl(doc.path);

        if (publicData?.publicUrl) {
          window.open(publicData.publicUrl, '_blank', 'noopener,noreferrer');
        } else {
          throw new Error('Could not get URL for file');
        }
      } else {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document: ' + error.message);
    }
  };

  const handleDownloadShipmentDoc = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('shipment-docs')
        .download(doc.path);

      if (error) throw error;

      // Create and trigger download
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document: ' + error.message);
    }
  };

  // Function to handle viewing files (for corporate tax documents)
  const handleViewFile = async (file) => {
    try {
      if (file.isStorageReference && file.file_path) {
        // Handle documents that are storage references
        const bucket = file.storage_bucket || 'reports';
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(file.file_path, 3600);

        if (error) {
          console.error('Error creating signed URL:', error);
          alert('Failed to view document: ' + error.message);
          return;
        }

        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      } else if (file.file) {
        // Handle locally uploaded files
        const url = URL.createObjectURL(file.file);
        window.open(url, '_blank', 'noopener,noreferrer');
        URL.revokeObjectURL(url);
      } else {
        alert('No file available for viewing.');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Failed to view document: ' + error.message);
    }
  };

  // Function to handle downloading files (for corporate tax documents)
  const handleDownloadFile = async (file) => {
    try {
      if (file.isStorageReference && file.file_path) {
        // Handle documents that are storage references
        const bucket = file.storage_bucket || 'reports';
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(file.file_path);

        if (error) {
          console.error('Error downloading file:', error);
          alert('Failed to download document: ' + error.message);
          return;
        }

        // Create and trigger download
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (file.file) {
        // Handle locally uploaded files
        const url = URL.createObjectURL(file.file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert('No file available for download.');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download document: ' + error.message);
    }
  };

  // Add this function for testing the enhanced data processing
  const createSampleData = () => {
    const sampleMail = {
      id: 'sample-1',
      document_name: 'VAT Assessment Notice',
      document_type: 'Tax Document',
      issue_date: '2024-01-15',
      file_path: 'sample/vat-notice.pdf',
      created_at: '2024-01-20',
      client_id: 'test-user',
      extracted_data: {
        // Financial Information
        amount: '2,450.00',
        currency: 'EUR',
        tax_amount: '490.00',
        total_amount: '2,450.00',
        
        // Dates and Deadlines
        due_date: '2024-02-15',
        issue_date: '2024-01-15',
        payment_date: null,
        expiry_date: '2024-03-15',
        
        // Document Information
        document_type: 'VAT Assessment',
        reference_number: 'VAT-2024-001',
        invoice_number: 'INV-2024-001',
        case_number: 'CASE-2024-001',
        
        // Company and Entity Information
        company_name: 'Sample Corp BV',
        tax_id: 'NL123456789B01',
        vat_number: 'NL123456789B01',
        kvk_number: '12345678',
        
        // Tax and Period Information
        tax_period: 'Q4 2023',
        fiscal_year: '2023',
        tax_rate: '21',
        
        // Additional Fields
        assessment_type: 'Regular',
        payment_method: 'Bank Transfer',
        late_fee_applicable: true,
        interest_rate: '4.5',
        appeal_rights: true,
        contact_person: 'John Doe',
        phone_number: '+31 20 123 4567',
        email: 'tax@samplecorp.nl',
        address: 'Sample Street 123, 1000 AB Amsterdam',
        postal_code: '1000 AB',
        city: 'Amsterdam',
        country: 'Netherlands'
      },
      deadlines: [
        {
          date: '2024-02-15',
          type: 'VAT Payment Due',
          description: 'Payment must be received by this date'
        },
        {
          date: '2024-02-28',
          type: 'Appeal Deadline',
          description: 'Last day to file an appeal'
        }
      ],
      recommendations: [
        {
          text: 'Review VAT calculations for accuracy',
          category: 'Financial',
          priority: 'high'
        },
        {
          text: 'Consider payment plan if funds are limited',
          category: 'Financial',
          priority: 'medium'
        },
        {
          text: 'Document all supporting evidence',
          category: 'Administrative',
          priority: 'medium'
        },
        {
          text: 'Consult with tax advisor if uncertain',
          category: 'Administrative',
          priority: 'low'
        }
      ],
      summary: 'VAT assessment notice for Q4 2023 with total amount of €2,450.00 due by February 15, 2024. Payment must be made to avoid penalties and interest charges.'
    };

    // Create a second sample document with different data
    const sampleMail2 = {
      id: 'sample-2',
      document_name: 'Corporate Income Tax Return',
      document_type: 'Tax Return',
      issue_date: '2024-01-10',
      file_path: 'sample/cit-return.pdf',
      created_at: '2024-01-12',
      client_id: 'test-user',
      extracted_data: {
        // Financial Information
        amount: '15,750.00',
        currency: 'EUR',
        tax_amount: '3,150.00',
        total_amount: '15,750.00',
        
        // Dates and Deadlines
        due_date: '2024-03-31',
        issue_date: '2024-01-10',
        payment_date: null,
        expiry_date: '2024-04-30',
        
        // Document Information
        document_type: 'Corporate Income Tax Return',
        reference_number: 'CIT-2024-001',
        invoice_number: null,
        case_number: 'CIT-CASE-2024-001',
        
        // Company and Entity Information
        company_name: 'Tech Solutions BV',
        tax_id: 'NL987654321B02',
        vat_number: 'NL987654321B02',
        kvk_number: '87654321',
        
        // Tax and Period Information
        tax_period: '2023',
        fiscal_year: '2023',
        tax_rate: '25',
        
        // Additional Fields
        return_type: 'Annual',
        filing_method: 'Electronic',
        extension_requested: false,
        estimated_payment: '12,000.00',
        deductions_applied: '3,750.00',
        net_taxable_income: '63,000.00',
        business_type: 'BV (Private Limited Company)',
        industry_sector: 'Technology Services',
        employee_count: '15',
        revenue: '250,000.00',
        expenses: '187,000.00'
      },
      deadlines: [
        {
          date: '2024-03-31',
          type: 'Tax Return Filing Deadline',
          description: 'Corporate income tax return must be filed by this date'
        },
        {
          date: '2024-04-30',
          type: 'Payment Deadline',
          description: 'Final tax payment must be made by this date'
        }
      ],
      recommendations: [
        {
          text: 'Review all deductions and expenses for accuracy',
          category: 'Financial',
          priority: 'high'
        },
        {
          text: 'Ensure all supporting documentation is complete',
          category: 'Administrative',
          priority: 'high'
        },
        {
          text: 'Consider tax optimization strategies for next year',
          category: 'Financial',
          priority: 'medium'
        },
        {
          text: 'Schedule consultation with tax advisor',
          category: 'Administrative',
          priority: 'low'
        }
      ],
      summary: 'Corporate income tax return for 2023 with total tax liability of €15,750.00. Filing deadline is March 31, 2024, with payment due by April 30, 2024.'
    };

    setIncomingMail([sampleMail, sampleMail2]);
  };

  // Function to fetch corporate tax analysis
  const fetchCorporateTaxAnalysis = async () => {
    try {
      setLoadingCorporateAnalysis(true);
      setCorporateAnalysisError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error('Authentication required');

      const currentUserId = sessionData.session.user.id;

      // Check if user has existing corporate tax analysis
      const { data, error } = await supabase
        .from('corporate_tax_analysis')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not check existing analysis:', error.message);
        // If table doesn't exist, that's fine - user will see no analysis
        if (error.code === '42P01') {
          console.info('Corporate tax analysis table does not exist yet.');
          setCorporateAnalysis(null);
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        setCorporateAnalysis(data[0]);
        
        // Also fetch any generated reports from storage
        await fetchCorporateTaxReports(currentUserId);
        
        // Fetch user profile data for company details
        await fetchUserProfile(currentUserId);
        
        // Fetch all previous analyses for better overview
        await fetchAllCorporateTaxAnalyses(currentUserId);
      } else {
        setCorporateAnalysis(null);
      }
    } catch (error) {
      console.error('Error fetching corporate tax analysis:', error);
      setCorporateAnalysisError(error.message);
      setCorporateAnalysis(null);
    } finally {
      setLoadingCorporateAnalysis(false);
    }
  };

  // Function to fetch all corporate tax analyses for overview
  const fetchAllCorporateTaxAnalyses = async (userId) => {
    try {
      const { data: allAnalyses, error: analysesError } = await supabase
        .from('corporate_tax_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (analysesError) {
        console.warn('Could not fetch all analyses:', analysesError.message);
        return;
      }

      if (allAnalyses && allAnalyses.length > 0) {
        // Store all analyses in state for display
        setAllCorporateAnalyses(allAnalyses);
        console.log('Fetched all corporate tax analyses:', allAnalyses);
      }
    } catch (error) {
      console.error('Error fetching all corporate tax analyses:', error);
    }
  };

  // Function to fetch corporate tax analysis reports
  const fetchCorporateTaxReports = async (userId) => {
    try {
      // Get all analyses with report URLs
      const { data: reportsData, error: reportsError } = await supabase
        .from('corporate_tax_analysis')
        .select('id, company_name, fiscal_year, created_at, report_url, final_tax_owed, taxable_income')
        .eq('user_id', userId)
        .not('report_url', 'is', null)
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.warn('Could not fetch reports:', reportsError.message);
        return;
      }

      if (reportsData && reportsData.length > 0) {
        setCorporateTaxReports(reportsData);
        console.log('Fetched corporate tax reports:', reportsData);
      } else {
        setCorporateTaxReports([]);
      }
    } catch (error) {
      console.error('Error fetching corporate tax reports:', error);
    }
  };

  // Function to fetch user profile data for company details
  const fetchUserProfile = async (userId) => {
    try {
      // Try to get user profile from user_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Could not fetch user profile:', profileError.message);
        return;
      }

      if (profileData) {
        setUserProfile(profileData);
        console.log('User profile data loaded:', profileData);
      }

      // Also try to get company details from companies table
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (companyError && companyError.code !== 'PGRST116') {
        console.warn('Could not fetch company data:', companyError.message);
        return;
      }

      if (companyData) {
        // Merge company data with user profile
        setUserProfile(prev => ({
          ...prev,
          ...companyData
        }));
        console.log('Company data loaded:', companyData);
      }

    } catch (error) {
      console.warn('Error fetching user profile/company data:', error.message);
    }
  };

  return (
    <div className="mailbox-container" style={{
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Add spinner CSS */}
      <style>{`
        .spinner {
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 2px solid #fff;
          width: 12px;
          height: 12px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ padding: '1rem', flexShrink: 0 }}>
      <h1>Inbox</h1>
      <p>Manage your physical and digital mail</p>
        
              {/* Header Navigation Bar */}
      {/* Success Message */}
      {successMessage && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          color: '#4CAF50',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          ✅ {successMessage}
      </div>
      )}

      <div className="mailbox-header-nav">
        {/* Left Section - Navigation Tabs */}
        <div className="nav-tabs">
            <button 
            className={activeTab === 'all-documents' ? 'active' : ''} 
            onClick={() => setActiveTab('all-documents')}
          >
            All Documents
          </button>
          <button 
            className={activeTab === 'incoming' ? 'active' : ''} 
            onClick={() => setActiveTab('incoming')}
              style={{
              background: 'transparent',
                color: 'white',
                border: 'none',
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
                cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Inbox
          </button>
          <button 
            className={activeTab === 'outgoing-email' ? 'active' : ''} 
            onClick={() => setActiveTab('outgoing-email')}
            style={{
              background: activeTab === 'outgoing-email' ? 'rgba(30, 20, 60, 0.8)' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: activeTab === 'outgoing-email' ? '1' : '0.8'
            }}
          >
            Outbox
          </button>
          <button 
            className={activeTab === 'shipment' ? 'active' : ''} 
            onClick={() => setActiveTab('shipment')}
            style={{
              background: activeTab === 'shipment' ? 'rgba(30, 20, 60, 0.8)' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: activeTab === 'shipment' ? '1' : '0.8'
            }}
          >
            Create Response
          </button>
          <button 
            className={activeTab === 'shipments' ? 'active' : ''} 
            onClick={() => setActiveTab('shipments')}
            style={{
              background: activeTab === 'shipments' ? 'rgba(30, 20, 60, 0.8)' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: activeTab === 'shipments' ? '1' : '0.8'
            }}
          >
            Shipments
          </button>
          
        
         
        
          <button 
            className={activeTab === 'services' ? 'active' : ''} 
            onClick={() => setActiveTab('services')}
            style={{
              background: activeTab === 'services' ? 'rgba(30, 20, 60, 0.8)' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: activeTab === 'services' ? '1' : '0.8'
            }}
          >
            Mailbox Services
          </button>
          
                
          
          <button 
            className={activeTab === 'settings' ? 'active' : ''} 
            onClick={() => setActiveTab('settings')}
            style={{
              background: activeTab === 'settings' ? 'rgba(30, 20, 60, 0.8)' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
                cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: activeTab === 'settings' ? '1' : '0.8'
              }}
            >
            Settings
            </button>
          </div>

        {/* Right Section - Action Buttons */}
        <div className="action-buttons">
          <button onClick={() => setActiveTab('shipment')}>
            Upload
          </button>
          <button onClick={() => setActiveTab('services')}>
            Create Channel
          </button>
            </div>
      </div>
      </div>

      {/* Main Content Area with Two-Column Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '300px 1fr', 
        gap: '2rem',
        flex: 1,
        overflow: 'hidden',
        padding: '0 1rem 1rem 1rem'
      }}>
        {/* Left Column - Channels Section */}
        <div className="mailbox-channels" style={{
          background: 'rgba(30, 20, 60, 0.5)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(60, 40, 100, 0.3)',
          height: 'fit-content',
          overflow: 'auto',
          maxHeight: '100%'
        }}>
          <h3 style={{ 
            color: '#fff', 
            margin: '0 0 1.5rem 0', 
            fontSize: '1.2rem', 
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            CHANNELS
          </h3>
          
          {/* Channel List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* VAT Return Channel */}
            <button 
              onClick={() => setActiveTab('vat-return')}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.8rem',
                background: activeTab === 'vat-return' ? 'rgba(60, 40, 100, 0.8)' : 'transparent',
                border: activeTab === 'vat-return' ? '1px solid rgba(147, 51, 234, 0.3)' : 'none',
                borderRadius: activeTab === 'vat-return' ? '12px' : '0',
                color: '#fff',
                fontSize: '0.9rem',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span>VAT Return</span>
            </button>

            {/* Corporate Tax Channel */}
            <button 
              onClick={() => setActiveTab('corporate-tax')}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.8rem',
                background: activeTab === 'corporate-tax' ? 'rgba(60, 40, 100, 0.8)' : 'rgba(255, 255, 255, 0.05)',
                border: activeTab === 'corporate-tax' ? '1px solid rgba(147, 51, 234, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px', 
                color: '#fff',
                fontSize: '0.9rem',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span>Corporate Tax</span>
            </button>



            {/* Branch Registration Channel */}
            <button 
              onClick={() => setActiveTab('statutory-documents')}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.8rem',
                background: activeTab === 'statutory-documents' ? 'rgba(60, 40, 100, 0.8)' : 'rgba(255, 255, 255, 0.05)',
                border: activeTab === 'statutory-documents' ? '1px solid rgba(147, 51, 234, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.9rem',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span>Branch Registration - DE</span>
            </button>

            {/* Mailbox Services Channel */}
            <button 
              onClick={() => setActiveTab('services')}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.8rem',
                background: activeTab === 'services' ? 'rgba(60, 40, 100, 0.8)' : 'rgba(255, 255, 255, 0.05)',
                border: activeTab === 'services' ? '1px solid rgba(147, 51, 234, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.9rem',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span>Mailbox Services</span>
            </button>

            {/* Dynamic User-Created Channels */}
            {channels.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: '#b8b8ff', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Custom Channels
                </h4>
                
                {/* Loading State */}
                {loadingChannels && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '0.5rem',
                    color: '#b8b8ff',
                    fontSize: '0.8rem'
                  }}>
                    Loading channels...
                  </div>
                )}

                {/* Dynamic Channels from Database */}
                {!loadingChannels && channels.map((channel) => (
                  <button 
                    key={channel.id}
                    onClick={() => setActiveTab(`channel-${channel.id}`)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.8rem',
                      background: activeTab === `channel-${channel.id}` ? 'rgba(60, 40, 100, 0.8)' : 'rgba(255, 255, 255, 0.05)',
                      border: activeTab === `channel-${channel.id}` ? '1px solid rgba(147, 51, 234, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <span>{channel.title}</span>
                    {channel.due_date && (
                      <span style={{ 
                        background: '#FF4B7E', 
                        color: 'white', 
                        padding: '0.3rem 0.6rem', 
                        borderRadius: '8px', 
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {new Date(channel.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No Custom Channels Message */}
            {!loadingChannels && channels.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '0.5rem',
                color: '#b8b8ff',
                fontSize: '0.8rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginTop: '1rem'
              }}>
                No custom channels yet
              </div>
            )}

            {/* Create Task Button */}
            <button 
              onClick={() => navigate('/calendar?action=create-task&subject=Channel Task&priority=medium&source=mailbox&type=channel-management')}
              style={{
                background: 'rgba(255, 75, 126, 0.2)',
                color: '#FF4B7E',
                border: '1px solid rgba(255, 75, 126, 0.3)',
                padding: '0.8rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '1rem',
                borderRadius: '8px',
                width: '100%',
                transition: 'all 0.2s ease'
              }}
            >
              📋 Create Task
            </button>

            {/* Create Channel Button */}
            <button 
              onClick={() => setShowCreateChannelModal(true)}
              style={{
                background: 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.8rem 0',
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '1rem',
                width: '100%'
              }}
            >
              + Create Channel
            </button>
          </div>
            </div>

        {/* Right Column - Main Content */}
        <div className="mailbox-main-content" style={{
          overflow: 'auto',
          maxHeight: '100%',
          paddingRight: '0.5rem'
        }}>
          {/* Legacy Tab Buttons - Keep for backward compatibility */}
         
          
          {/* All Documents Tab - Shows overview of all document types */}
          {activeTab === 'all-documents' && (
        <div className="all-documents-tab" style={{ marginTop: '2rem' }}>
          <h2>All Documents</h2>
          <p style={{ color: '#b8b8ff', marginBottom: '2rem' }}>
            Overview of all your documents across different categories
          </p>
          
          {/* Document Statistics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#4CAF50' }}>📄 Total Documents</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                {incomingMail.length + outgoingEmails.length}
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#FF4B7E' }}>📥 Incoming Mail</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                {incomingMail.length}
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#FF8800' }}>📤 Outgoing Documents</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                {outgoingEmails.length}
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#4CAF50' }}>🚚 Shipments</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                {shipments.length}
              </div>
            </div>
          </div>

          {/* Quick Access Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              onClick={() => setActiveTab('incoming')}
              style={{
                background: 'rgba(60, 40, 100, 0.7)',
                        color: 'white', 
                border: 'none',
                padding: '1rem',
                        borderRadius: '12px', 
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              📥 View Incoming Mail
            </button>
            <button 
              onClick={() => setActiveTab('outgoing-email')}
              style={{
                background: 'rgba(60, 40, 100, 0.7)',
                        color: 'white', 
                border: 'none',
                padding: '1rem',
                        borderRadius: '12px', 
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              📤 View Outgoing Documents
            </button>
            <button 
              onClick={() => setActiveTab('corporate-analysis')}
              style={{
                background: 'rgba(60, 40, 100, 0.7)',
                color: 'white',
                border: 'none',
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              📊 View Corporate Analysis
            </button>
            <button 
              onClick={() => setActiveTab('shipments')}
              style={{
                background: 'rgba(60, 40, 100, 0.7)',
                color: 'white',
                border: 'none',
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              🚚 View Shipments
            </button>
          </div>
            </div>
      )}

      {activeTab === 'incoming' && (
        <>
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Inbox (Process Triage)</h2>
          <p style={{ color: '#b8b8ff', marginBottom: '2rem' }}>
            Inbox actions classify items into Channels, trigger AI analysis using oDoc analyzer, generate actions, and sync deadlines to the calendar.
          </p>
        
          
          
          {/* Process Triage Card */}
          <div style={{ 
            background: 'rgba(30, 20, 60, 0.8)', 
            borderRadius: '16px', 
            padding: '2rem',
            border: '1px solid rgba(60, 40, 100, 0.3)',
            marginBottom: '2rem'
          }}>
            {/* Tax Return Invitation Entry */}
         

            {/* Additional Sample Entries */}
            {incomingMail.map((mail, index) => (
              <div key={mail.id} style={{ 
                padding: '1.5rem', 
                borderBottom: index < incomingMail.length - 1 ? '1px solid rgba(147, 51, 234, 0.3)' : 'none',
                marginBottom: index < incomingMail.length - 1 ? '1.5rem' : '0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      {mail.subject}
                    </h3>
                    <p style={{ color: '#d1d5db', margin: '0', fontSize: '0.9rem' }}>
                      {mail.sender} • {mail.date}
                    </p>
                    {mail.deadlinePriority === 'high' && (
                      <span style={{ 
                        color: '#FF4444', 
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        marginTop: '0.5rem',
                        display: 'inline-block'
                      }}>
                        ⚠️ Due Soon
                      </span>
                    )}
                        </div>
                  {mail.hasAnalysis && (
                    <span style={{ 
                      background: 'rgba(76, 175, 80, 0.3)', 
                      color: '#4CAF50', 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem',
                      marginLeft: '1rem'
                    }}>
                      🤖 AI Analyzed
                    </span>
                      )}
                    </div>
                
                {/* Action Buttons for Dynamic Mail */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => handleViewMail(mail)}
                    title="Open document in new tab"
                          style={{
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                            color: 'white',
                      border: 'none',
                            borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    👁️ Open
                  </button>
                  <button 
                    onClick={() => handleAnalyzeMail(mail)}
                    disabled={analyzingDocument === mail.id}
                    title="Analyze document using AI (oDoc analyzer)"
                    style={{
                      background: analyzingDocument === mail.id 
                        ? 'rgba(33, 150, 243, 0.6)' 
                        : 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      cursor: analyzingDocument === mail.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      opacity: analyzingDocument === mail.id ? 0.7 : 1
                    }}
                  >
                    {analyzingDocument === mail.id ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div className="spinner" style={{ width: '12px', height: '12px' }}></div>
                        Analyzing...
                      </span>
                    ) : (
                      '🤖 Start Analysis'
                    )}
                  </button>
                  <button 
                    onClick={() => navigate('/calendar?action=create-task&subject=Document Review&priority=medium&source=mailbox&type=document-analysis')}
                    style={{
                      background: 'linear-gradient(135deg, #FF4B7E 0%, #FF6B9D 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Create Task
                  </button>

                    </div>
              </div>
            ))}
          </div>

          {/* Legacy Toolbar - Keep for additional functionality */}
        
        </>
      )}
      {activeTab === 'outgoing-email' && (
        <div className="outgoing-email-tab" style={{ marginTop: '2rem' }}>
          <h2>Signed Documents</h2>
          <p style={{ color: '#b8b8ff', marginBottom: '2rem' }}>
            Manage your signed documents, contracts, and agreements with AI-powered analysis
          </p>
          
          {/* Document Statistics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#4CAF50' }}>📄 Total Documents</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                {outgoingEmails.length}
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#FF4B7E' }}>🤖 AI Analyzed</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                {outgoingEmails.filter(doc => doc.hasAnalysis).length}
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#FF8800' }}>✍️ Signed</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                {outgoingEmails.filter(doc => doc.status === 'signed').length}
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#ff4444' }}>⚠️ High Priority</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                {outgoingEmails.filter(doc => doc.priority_level === 'high').length}
              </div>
            </div>
          </div>
          
          {/* Search and Filter Toolbar */}
          <div className="mailbox-toolbar" style={{ marginBottom: '2rem' }}>
            <input 
              placeholder="Search documents..." 
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(60, 40, 100, 0.3)',
                background: 'rgba(30, 20, 60, 0.5)',
                color: 'white',
                width: '300px'
              }}
            />
            <select style={{
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(60, 40, 100, 0.3)',
              background: 'rgba(30, 20, 60, 0.5)',
              color: 'white'
            }}>
              <option value="">All Categories</option>
              <option value="contract">Contract</option>
              <option value="agreement">Agreement</option>
              <option value="invoice">Invoice</option>
              <option value="tax">Tax Document</option>
              <option value="legal">Legal Document</option>
            </select>
            <select style={{
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(60, 40, 100, 0.3)',
              background: 'rgba(30, 20, 60, 0.5)',
              color: 'white'
            }}>
              <option value="">All Statuses</option>
              <option value="signed">Signed</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
            </select>
            <button style={{
              background: 'rgba(60, 40, 100, 0.7)',
              color: 'white',
              border: 'none',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Filter
            </button>
            <button style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Refresh
            </button>
          </div>
          
          {loadingOutgoingEmails && <p>Loading signed documents...</p>}
          {outgoingEmailsError && <p style={{ color: 'red' }}>Error loading signed documents: {outgoingEmailsError.message}</p>}
          {!loadingOutgoingEmails && outgoingEmails.length === 0 && <p>No signed documents found.</p>}
          {!loadingOutgoingEmails && outgoingEmails.length > 0 && (
            <div className="mailbox-list">
              <div className="mailbox-list-header">
                <span>Document Details</span>
                <span>Created Date</span>
                <span>Actions</span>
              </div>
              {outgoingEmails.map(email => (
                <div className="mailbox-list-item" key={email.id}>
                  <span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <strong>{email.document_type}</strong>
                    {email.hasAnalysis && (
                      <span style={{ 
                        background: '#4CAF50', 
                        color: 'white', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        AI ANALYZED
                      </span>
                    )}
                    {email.status && (
                      <span style={{ 
                        background: email.status === 'signed' ? '#4CAF50' : '#FF8800', 
                        color: 'white', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        {email.status.toUpperCase()}
                      </span>
                    )}
                    {email.priority_level && (
                      <span style={{ 
                        background: email.priority_level === 'high' ? '#ff4444' : 
                                   email.priority_level === 'medium' ? '#ff8800' : '#4CAF50', 
                        color: 'white', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        {email.priority_level.toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>{email.document_name}</div>
                  
                  {/* Company Information */}
                  {email.company_name && (
                    <div style={{ fontSize: '0.85rem', color: '#b8b8ff', marginBottom: '0.3rem' }}>
                      Company: {email.company_name}
                    </div>
                  )}
                  
                  {/* Financial Information */}
                  {email.amount && (
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#FF4B7E', 
                      fontWeight: 'bold',
                      marginBottom: '0.3rem'
                    }}>
                      Amount: {email.currency || '€'}{email.amount}
                    </div>
                  )}
                  
                  {/* Dates Information */}
                  {email.issue_date && (
                    <div style={{ fontSize: '0.85rem', color: '#FFB300', marginBottom: '0.3rem' }}>
                      Issue: {new Date(email.issue_date).toLocaleDateString()}
                    </div>
                  )}
                  {email.due_date && (
                    <div style={{ fontSize: '0.85rem', color: '#ff4444', marginBottom: '0.3rem' }}>
                      Due: {new Date(email.due_date).toLocaleDateString()}
                    </div>
                  )}
                  
                  {/* Signing Information */}
                  {email.signer_name && (
                    <div style={{ fontSize: '0.85rem', color: '#b8b8ff', marginBottom: '0.3rem' }}>
                      Signed by: {email.signer_name}
                    </div>
                  )}
                  {email.signature_date && (
                    <div style={{ fontSize: '0.85rem', color: '#b8b8ff', marginBottom: '0.3rem' }}>
                      Signed: {new Date(email.signature_date).toLocaleDateString()}
                    </div>
                  )}
                  
                  {/* Analysis Status */}
                  {email.analysis_status && (
                    <div style={{ fontSize: '0.85rem', color: '#4CAF50', marginBottom: '0.3rem' }}>
                      Analysis: {email.analysis_status}
                    </div>
                  )}
                  
                  {/* Tags */}
                  {email.tags && email.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {email.tags.map((tag, index) => (
                        <span 
                          key={index}
                          style={{
                            background: 'rgba(60, 40, 100, 0.7)',
                            color: 'white',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '8px',
                            fontSize: '0.7rem'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  </span>
                  <span>{new Date(email.created_at).toLocaleDateString()}</span>
                  <span>
                    <button title="Download" onClick={() => handleDownloadOutgoingEmail(email)}><FaDownload /></button>
                  <button 
                    title="AI Analysis" 
                    onClick={() => handleAnalyzeOutgoingEmail(email)}
                    disabled={analyzingDocument === email.id}
                    style={{
                      opacity: analyzingDocument === email.id ? 0.6 : 1,
                      cursor: analyzingDocument === email.id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {analyzingDocument === email.id ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div className="spinner" style={{ width: '12px', height: '12px' }}></div>
                        Analyzing...
                      </span>
                    ) : (
                      <FaRobot />
                    )}
                  </button>
                    <button title="View" onClick={() => handleViewOutgoingEmail(email)}><HiOutlineExternalLink /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === 'vat-return' && (
        <div className="vat-return-tab" style={{ marginTop: '2rem' }}>
          <h2>VAT Return Management</h2>
          <p style={{ color: '#b8b8ff', marginBottom: '2rem' }}>
            Manage your VAT returns, submissions, and related documentation
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* VAT Return Status Card */}
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#FF4B7E' }}>📊 Current VAT Period</h3>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Q4 2023</strong>
                <div style={{ color: '#4CAF50', fontSize: '0.9rem' }}>Status: Submitted</div>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                <div>Due Date: 31/01/2024</div>
                <div>Amount: €2,450.00</div>
                <div>Payment Status: Paid</div>
              </div>
            </div>

            {/* VAT Return Actions Card */}
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>⚡ Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button style={{
                  background: '#FF4B7E',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  📝 Submit New VAT Return
                </button>
                <button style={{
                  background: 'rgba(60, 40, 100, 0.7)',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  📊 View VAT History
                </button>
                <button style={{
                  background: 'rgba(60, 40, 100, 0.7)',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  💰 Calculate VAT Liability
                </button>
              </div>
            </div>
          </div>

          {/* VAT Return Table */}
          <div style={{ 
            background: 'rgba(30, 20, 60, 0.5)', 
            padding: '1.5rem', 
            borderRadius: '16px',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>VAT Return History</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Period</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Due Date</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Amount</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Status</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.8rem' }}>Q4 2023</td>
                  <td style={{ padding: '0.8rem' }}>31/01/2024</td>
                  <td style={{ padding: '0.8rem', color: '#FF4B7E', fontWeight: 'bold' }}>€2,450.00</td>
                  <td style={{ padding: '0.8rem' }}>
                    <span style={{ 
                      background: '#4CAF50', 
                      color: 'white', 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem' 
                    }}>
                      Submitted
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem' }}>
                    <button style={{
                      background: 'rgba(60, 40, 100, 0.7)',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      marginRight: '0.5rem'
                    }}>
                      View
                    </button>
                    <button style={{
                      background: '#FF4B7E',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}>
                      Download
                    </button>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.8rem' }}>Q3 2023</td>
                  <td style={{ padding: '0.8rem' }}>31/10/2023</td>
                  <td style={{ padding: '0.8rem', color: '#FF4B7E', fontWeight: 'bold' }}>€1,890.00</td>
                  <td style={{ padding: '0.8rem' }}>
                    <span style={{ 
                      background: '#4CAF50', 
                      color: 'white', 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem' 
                    }}>
                      Submitted
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem' }}>
                    <button style={{
                      background: 'rgba(60, 40, 100, 0.7)',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      marginRight: '0.5rem'
                    }}>
                      View
                    </button>
                    <button style={{
                      background: '#FF4B7E',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}>
                      Download
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'corporate-tax' && (
        <div className="corporate-tax-tab" style={{ marginTop: '2rem' }}>
          <h2>Corporate Tax Management</h2>
          <p style={{ color: '#b8b8ff', marginBottom: '2rem' }}>
            Manage corporate income tax returns, assessments, and compliance
          </p>
          
          {/* Corporate Tax Analysis Section */}
          {loadingCorporateAnalysis && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1rem' }}></div>
              <p>Loading corporate tax analysis...</p>
            </div>
          )}
          
          {corporateAnalysisError && (
            <div style={{ 
              background: 'rgba(220, 38, 38, 0.1)', 
              border: '1px solid #dc2626', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginBottom: '2rem',
              color: '#fca5a5'
            }}>
              Error loading analysis: {corporateAnalysisError}
            </div>
          )}

          {/* Display Existing Corporate Tax Analysis */}
          {corporateAnalysis && (
            <div style={{ 
              background: '#23244d', 
              borderRadius: '16px', 
              padding: '2rem', 
              marginBottom: '2rem',
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '1rem' }}>
                  📄 Corporate Tax Reports
                </h3>
                <p style={{ color: '#bfc9da', fontSize: '1.1rem' }}>
                  View and download your generated corporate tax analysis reports
                </p>
                <button
                  onClick={() => {
                    if (corporateAnalysis) {
                      fetchCorporateTaxReports(corporateAnalysis.user_id);
                    }
                  }}
                  style={{
                    background: 'rgba(60, 40, 100, 0.7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🔄 Refresh Reports
                </button>
              </div>

                             {/* Show existing reports if available */}
              {corporateTaxReports && corporateTaxReports.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {corporateTaxReports.map((report, index) => (
                    <div key={report.id} style={{
                background: '#1e293b', 
                borderRadius: '12px', 
                    padding: '1.5rem',
                      border: '1px solid #3a3b5a',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                  }}>
                      <div style={{ flex: 1 }}>
                    <h4 style={{ 
                          color: '#fff', 
                          margin: '0 0 0.5rem 0',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}>
                          {report.company_name || 'Company'} - {report.fiscal_year || 'Year'}
                    </h4>
                        <div style={{ 
                          display: 'flex', 
                          gap: '1rem', 
                          fontSize: '0.9rem', 
                          color: '#9ca3af' 
                        }}>
                          <span>📅 Generated: {new Date(report.created_at).toLocaleDateString()}</span>
                          {report.taxable_income && (
                            <span>💰 Taxable Income: {formatCurrency(report.taxable_income)}</span>
                          )}
                          {report.final_tax_owed && (
                            <span>💸 Tax Owed: {formatCurrency(report.final_tax_owed)}</span>
                          )}
                    </div>
                  </div>

                  <div style={{
                        display: 'flex', 
                        gap: '0.5rem', 
                        marginLeft: '1rem' 
                      }}>
                        <button
                          onClick={() => window.open(report.report_url, '_blank')}
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
                            transition: 'all 0.2s ease'
                          }}
                        >
                          👁️ View Report
                        </button>
                        <button
                          onClick={() => {
                            // Create a download link for the PDF
                            const link = document.createElement('a');
                            link.href = report.report_url;
                            link.download = `Corporate_Tax_Report_${report.company_name || 'Company'}_${report.fiscal_year || 'Year'}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          style={{
                            background: '#3b82f6',
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
                            transition: 'all 0.2s ease'
                          }}
                        >
                          ⬇️ Download
                        </button>
                    </div>
                  </div>
                  ))}
                      </div>
              ) : (
                    <div style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '2rem',
                  border: '1px solid #3a3b5a',
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  <h4 style={{ color: '#bfc9da', marginBottom: '1rem' }}>
                    📄 No Generated Reports Yet
                      </h4>
                  <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: '1rem' }}>
                    You have completed corporate tax analysis, but no PDF reports have been generated yet.
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                    Generate a PDF report from your analysis to view and download it here.
                  </p>
                    </div>
                  )}

                {/* Action Buttons */}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        navigate('/comprehensive-tax-dashboard');
                      }}
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
                      Start New Analysis
                    </button>
                    <button
                      onClick={() => {
                        fetchCorporateTaxAnalysis();
                      }}
                      style={{
                        background: 'rgba(60, 40, 100, 0.7)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Refresh Data
                    </button>
                </div>
              </div>
            </div>
          )}

          {/* No Analysis Found Message */}
          {!loadingCorporateAnalysis && !corporateAnalysis && !corporateAnalysisError && (
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              borderRadius: '16px', 
              padding: '2rem', 
              marginBottom: '2rem',
              textAlign: 'center',
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ color: '#fff', marginBottom: '1rem' }}>
                No Corporate Tax Analysis Found
              </h3>
              <p style={{ color: '#bfc9da', fontSize: '1.1rem', marginBottom: '2rem' }}>
                You haven't completed any corporate tax analysis yet. Start your first analysis to get insights into your corporate tax position.
              </p>
              <button
                onClick={() => {
                  navigate('/comprehensive-tax-dashboard');
                }}
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
                Start Corporate Tax Analysis
              </button>
            </div>
          )}

         
        </div>
      )}
      {activeTab === 'statutory-documents' && (
        <div className="statutory-documents-tab" style={{ marginTop: '2rem' }}>
          <h2>Statutory Documents</h2>
          <p style={{ color: '#b8b8ff', marginBottom: '2rem' }}>
            Manage statutory filings, annual reports, and compliance documents
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* Statutory Status Card */}
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>📋 Compliance Status</h3>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Current Year: 2024</strong>
                <div style={{ color: '#4CAF50', fontSize: '0.9rem' }}>Status: Compliant</div>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                <div>Annual Report: Due 31/03/2024</div>
                <div>UBO Declaration: Up to date</div>
                <div>KYC Status: Verified</div>
              </div>
            </div>

            {/* Statutory Actions Card */}
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>⚡ Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  📄 Submit Annual Report
                </button>
                <button style={{
                  background: 'rgba(60, 40, 100, 0.7)',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  👥 UBO Declaration
                </button>
                <button style={{
                  background: 'rgba(60, 40, 100, 0.7)',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  🔍 Compliance Check
                </button>
              </div>
            </div>
          </div>

          {/* Statutory Documents Table */}
          <div style={{ 
            background: 'rgba(30, 20, 60, 0.5)', 
            padding: '1.5rem', 
            borderRadius: '16px',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Document Status</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Document Type</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Due Date</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Status</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Last Updated</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.8rem' }}>Annual Report 2023</td>
                  <td style={{ padding: '0.8rem' }}>31/03/2024</td>
                  <td style={{ padding: '0.8rem' }}>
                    <span style={{ 
                      background: '#FF8800', 
                      color: 'white', 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem' 
                    }}>
                      Pending
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem' }}>15/01/2024</td>
                  <td style={{ padding: '0.8rem' }}>
                    <button style={{
                      background: '#FF8800',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      marginRight: '0.5rem'
                    }}>
                      Submit
                    </button>
                    <button style={{
                      background: 'rgba(60, 40, 100, 0.7)',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}>
                      Template
                    </button>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.8rem' }}>UBO Declaration</td>
                  <td style={{ padding: '0.8rem' }}>31/12/2023</td>
                  <td style={{ padding: '0.8rem' }}>
                    <span style={{ 
                      background: '#4CAF50', 
                      color: 'white', 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem' 
                    }}>
                      Submitted
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem' }}>28/12/2023</td>
                  <td style={{ padding: '0.8rem' }}>
                    <button style={{
                      background: 'rgba(60, 40, 100, 0.7)',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      marginRight: '0.5rem'
                    }}>
                      View
                    </button>
                    <button style={{
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}>
                      Download
                    </button>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.8rem' }}>KYC Verification</td>
                  <td style={{ padding: '0.8rem' }}>31/12/2023</td>
                  <td style={{ padding: '0.8rem' }}>
                    <span style={{ 
                      background: '#4CAF50', 
                      color: 'white', 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem' 
                    }}>
                      Verified
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem' }}>20/12/2023</td>
                  <td style={{ padding: '0.8rem' }}>
                    <button style={{
                      background: 'rgba(60, 40, 100, 0.7)',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      marginRight: '0.5rem'
                    }}>
                      View
                    </button>
                    <button style={{
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}>
                      Renew
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'services' && (
        <div className="mailbox-services-cards" style={{ display: 'flex', gap: '2rem', marginTop: '2rem', justifyContent: 'space-around', flexWrap: 'wrap' }}>
          {/* Mail Forwarding Card */}
          <div className="mailbox-service-card" style={{ flex: '1 1 300px', background: 'rgba(30, 20, 60, 0.5)', padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <div className="service-icon" style={{ background: 'rgba(60, 40, 100, 0.7)', padding: '1rem', borderRadius: '12px', fontSize: '1.8rem' }}>📩</div>
            <h2 style={{marginTop: 0, marginBottom: 0, fontSize: '1.5rem', fontWeight: 600}}>Mail Forwarding</h2>
            <p style={{marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: '#ccc'}}>Have your mail automatically forwarded to your preferred address or digitally scanned and sent to your email.</p>
            <div style={{fontSize: '0.9rem', color: '#ccc'}}>Auto-forwarding: <span style={{ color: 'limegreen', fontWeight: 600 }}>Active</span></div>
            <div style={{fontSize: '0.9rem', color: '#ccc'}}>Next scheduled: <b>Daily at 4:00 PM</b></div>
            <button className="service-action" style={{marginTop: '1.5rem', background: 'rgba(60, 40, 100, 0.7)', color: 'white', fontWeight: 600, padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer'}}>Configure Forwarding</button>
          </div>
          {/* Mail Scanning Card */}
          <div className="mailbox-service-card" style={{ flex: '1 1 300px', background: 'rgba(30, 20, 60, 0.5)', padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <div className="service-icon" style={{ background: 'rgba(60, 40, 100, 0.7)', padding: '1rem', borderRadius: '12px', fontSize: '1.8rem' }}>📠</div>
            <h2 style={{marginTop: 0, marginBottom: 0, fontSize: '1.5rem', fontWeight: 600}}>Mail Scanning</h2>
            <p style={{marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: '#ccc'}}>We scan your mail and make it available in your digital mailbox, with secure storage and OCR text recognition.</p>
            <div style={{fontSize: '0.9rem', color: '#ccc'}}>Auto-scanning: <span style={{ color: 'limegreen', fontWeight: 600 }}>Active</span></div>
            <div style={{fontSize: '0.9rem', color: '#ccc'}}>Storage: <b>12 months</b></div>
            <button className="service-action" style={{marginTop: '1.5rem', background: 'rgba(60, 40, 100, 0.7)', color: 'white', fontWeight: 600, padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer'}}>Configure Scanning</button>
          </div>
          {/* AI Document Analysis Card */}
          <div className="mailbox-service-card" style={{ flex: '1 1 300px', background: 'rgba(30, 20, 60, 0.5)', padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <div className="service-icon" style={{ background: 'rgba(60, 40, 100, 0.7)', padding: '1rem', borderRadius: '12px', fontSize: '1.8rem' }}>🧬</div>
            <h2 style={{marginTop: 0, marginBottom: 0, fontSize: '1.5rem', fontWeight: 600}}>AI Document Analysis</h2>
            <p style={{marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: '#ccc'}}>Our AI system automatically identifies document types, extracts key information, and provides actionable insights.</p>
            <div style={{fontSize: '0.9rem', color: '#ccc'}}>Auto-analysis: <span style={{ color: 'limegreen', fontWeight: 600 }}>Active</span></div>
            <div style={{fontSize: '0.9rem', color: '#ccc'}}>Language support: <b>Dutch, English</b></div>
            <button 
              className="service-action" 
              onClick={() => navigate('/ai-analyzer')}
              style={{
                marginTop: '1.5rem',
                background: 'rgba(60, 40, 100, 0.7)',
                color: 'white',
                fontWeight: 600,
                padding: '0.8rem 1.5rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Upload Document for Analysis
            </button>
          </div>
        </div>
      )}
      {activeTab === 'shipment' && (
        <form className="prepare-shipment-form" onSubmit={handleCreateShipment} style={{marginTop: '2rem'}}>
          <h2 style={{marginBottom: 0}}>Prepare Shipment</h2>
          <p style={{marginTop: 0}}>Create and manage outgoing shipments. We'll handle the packaging, postage, and delivery.</p>
          <div className="shipment-form-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', background: 'rgba(30, 20, 60, 0.5)', padding: '2.5rem', borderRadius: '20px', marginTop: '2rem'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.8rem'}}>
              <div>
                <label style={{fontWeight: 500, marginBottom: '0.5rem', display: 'block'}}>Shipment Type</label>
                <div style={{ position: 'relative' }} className="shipment-type-dropdown">
                  <button
                    type="button"
                    onClick={() => setShowShipmentTypeDropdown(!showShipmentTypeDropdown)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: '#2d3748',
                      border: '1px solid rgba(60, 40, 100, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{shipmentType}</span>
                    <span style={{ 
                      transform: showShipmentTypeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      fontSize: '1.2rem'
                    }}>
                      ▼
                    </span>
                  </button>
                  
                  {showShipmentTypeDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#2d3748',
                      border: '1px solid rgba(60, 40, 100, 0.3)',
                      borderRadius: '8px',
                      marginTop: '2px',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}>
                      {[
                        'Objection Letter',
                        'Extension Letter', 
                        'Payment Plan Request Letter'
                      ].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setShipmentType(type);
                            setShowShipmentTypeDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            background: 'transparent',
                            border: 'none',
                            color: shipmentType === type ? '#8b5cf6' : '#fff',
                            fontSize: '0.9rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(60, 40, 100, 0.1)',
                            transition: 'all 0.2s ease',
                            fontWeight: shipmentType === type ? '600' : '400'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Section Header for Shipment Creation */}
              <div style={{
                gridColumn: '1 / -1',
                marginBottom: '1rem',
                padding: '1rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3 style={{
                  color: '#8b5cf6',
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  🚚 Create Shipment
                </h3>
                <p style={{
                  color: '#a78bfa',
                  margin: 0,
                  fontSize: '0.9rem'
                }}>
                  Fill out the form below to create a shipment with your selected document
                </p>
              </div>
              {shipmentType && (
                <div style={{marginTop: '0.5rem', padding: '1.2rem', background: 'rgba(60, 40, 100, 0.5)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{flexGrow: 1}}>
                    <h4 style={{marginTop: 0, marginBottom: 0, marginRight: '1rem', display: 'inline-block'}}>{shipmentType}</h4>
                  </div>
                                      <div style={{display: 'flex', gap: '0.5rem'}}>
                      {/* Template Preview and Copy buttons for letter types */}
                      {(shipmentType === 'Objection Letter' || shipmentType === 'Extension Letter' || shipmentType === 'Payment Plan Request Letter') && (
                        <>
                          {/* Template Preview Button */}
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowTemplatePreview(!showTemplatePreview);
                            }}
                            type="button"
                            style={{
                              padding: '0.5rem 0.8rem', 
                              borderRadius: '8px', 
                              border: 'none', 
                              cursor: 'pointer',
                              background: '#8b5cf6',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              marginRight: '0.5rem'
                            }}
                            title="Preview Template Content"
                          >
                            👁️ Preview Template
                          </button>
                          
                          {/* Copy Template Button */}
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Copy button clicked - preventing any form submission');
                              
                              if (shipmentType === 'Objection Letter') {
                                copyObjectionLetterTemplateOnly();
                              } else if (shipmentType === 'Extension Letter') {
                                copyExtensionLetterTemplateOnly();
                              } else if (shipmentType === 'Payment Plan Request Letter') {
                                copyPaymentPlanRequestLetterTemplateOnly();
                              }
                            }}
                            type="button"
                            style={{
                              padding: '0.5rem 0.8rem', 
                              borderRadius: '8px', 
                              border: 'none', 
                              cursor: 'pointer',
                              background: '#10b981',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Copy Template to Clipboard"
                          >
                            📋 Copy Template
                          </button>
                        </>
                      )}
                      
                      {/* Download button for other document types */}
                      {!(shipmentType === 'Objection Letter' || shipmentType === 'Extension Letter' || shipmentType === 'Payment Plan Request Letter') && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownloadShipmentDocument();
                          }}
                          type="button"
                          style={{
                            padding: '0.5rem 0.8rem', 
                            borderRadius: '8px', 
                            border: 'none', 
                            cursor: 'pointer',
                            background: '#3b82f6',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                          title="Download Document Template"
                        >
                          <MdOutlineDownload /> Download
                        </button>
                      )}
                    {/* Upload button for all letter types */}
                    <button 
                      onClick={handleUploadShipmentDocument}
                      disabled={uploading}
                      style={{
                        padding: '0.5rem 0.8rem', 
                        borderRadius: '8px', 
                        border: 'none', 
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        opacity: uploading ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#8b5cf6'
                      }}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner"></span> Uploading...
                        </>
                      ) : (
                        <>
                          <MdOutlineUpload /> 
                          {selectedFile ? 'Change File' : 'Upload'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              {/* Informational message about templates vs shipments */}
              {shipmentType && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  color: '#bfc9da'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1rem' }}>💡</span>
                    <strong style={{ color: '#3b82f6' }}>Template vs Shipment</strong>
                  </div>
                  <p style={{ margin: 0, lineHeight: '1.4' }}>
                    {(shipmentType === 'Objection Letter' || shipmentType === 'Extension Letter' || shipmentType === 'Payment Plan Request Letter')
                      ? '📋 Copy Template: Gets the letter template with your company details mapped in. This does NOT create a shipment.'
                      : '📥 Download Template: Downloads the document template. This does NOT create a shipment.'
                    }
                    <br />
                    <strong>🚚 To create a shipment:</strong> Fill out the form below and click "Create Shipment" at the bottom.
                  </p>
                </div>
              )}
              <div>
                <label style={{fontWeight: 500, marginBottom: '0.5rem', display: 'block'}}>Recipient</label>
                <input
                  type="text"
                  placeholder="Recipient name"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="mailbox-input"
                  style={{width: '100%', marginBottom: '1rem'}}
                />
                <textarea
                  placeholder="Recipient address"
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                  rows={2}
                  className="mailbox-input"
                />
              </div>
              <div>
                <label style={{fontWeight: 500, marginBottom: '0.5rem', display: 'block'}}>Delivery Method</label>
                <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)} className="mailbox-input">
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Priority">Priority</option>
                  <option value="Registered Mail">Registered Mail</option>
                </select>
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.8rem'}}>
              <div>
                <label style={{fontWeight: 500, marginBottom: '0.5rem', display: 'block'}}>Shipment Contents</label>
                <textarea
                  placeholder="Describe the contents of your shipment"
                  value={shipmentContents}
                  onChange={e => setShipmentContents(e.target.value)}
                  rows={4}
                  className="mailbox-input"
                />
              </div>
              <div>
                <label style={{fontWeight: 500, marginBottom: '0.5rem', display: 'block'}}>Tracking Options</label>
                <div className="checkbox-group" style={{display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem'}}>
                  <label style={{fontWeight: 600}}><input type="checkbox" checked={tracking} onChange={e => setTracking(e.target.checked)} /> Include tracking</label>
                  <label style={{fontWeight: 600}}><input type="checkbox" checked={deliveryConfirmation} onChange={e => setDeliveryConfirmation(e.target.checked)} /> Delivery confirmation</label>
                  <label style={{fontWeight: 600}}><input type="checkbox" checked={insurance} onChange={e => setInsurance(e.target.checked)} /> Insurance</label>
                </div>
              </div>
              <div>
                <label style={{fontWeight: 500, marginBottom: '0.5rem', display: 'block'}}>Scheduled Date</label>
                <DatePicker
                  selected={scheduledDate}
                  onChange={(date) => setScheduledDate(date)}
                  dateFormat="dd-MM-yyyy"
                  className="mailbox-input"
                  placeholderText="dd-mm-yyyy"
                />
              </div>
            </div>
          </div>
          
          {/* Template Preview Modal */}
          {showTemplatePreview && (
            <div className="template-preview-container" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem'
            }}>
              <div style={{
                background: '#1e293b',
                borderRadius: '16px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                border: '1px solid rgba(60, 40, 100, 0.3)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Header */}
                <div style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  padding: '1rem',
                  borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h4 style={{
                    margin: 0,
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}>
                    📋 {shipmentType} Template Preview
                  </h4>
                  <button
                    onClick={() => setShowTemplatePreview(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                    }}
                  >
                    ✕
                  </button>
                </div>
                
                {/* Template Content */}
                <div style={{
                  padding: '1rem',
                  maxHeight: '300px',
                  overflow: 'auto',
                  color: '#d1d5db',
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {shipmentType === 'Objection Letter' && (
                    <div>
                      <strong style={{ color: '#8b5cf6' }}>Objection Letter Template:</strong>
                      <br />
                      Corporate Tax Assessment {new Date().getFullYear()}
                      <br /><br />
                      [Company Letterhead]
                      <br />
                      Belastingdienst
                      <br />
                      [Relevant Tax Office Address]
                      <br />
                      [Postal Code and City]
                      <br />
                      The Netherlands
                      <br /><br />
                      Date: [Insert Date]
                      <br />
                      Subject: Notice of Objection (Bezwaarschrift) - Corporate Tax Assessment {new Date().getFullYear()}
                      <br />
                      Tax Reference Number: [Insert Reference Number]
                      <br />
                      RSIN/KVK Number: [Your RSIN]/[Your KVK]
                      <br />
                      Tax Year: {new Date().getFullYear()}
                      <br />
                      Assessment Date: [Insert Date of Assessment]
                      <br /><br />
                      Dear Sir/Madam,
                      <br /><br />
                      1. Formal Notice of Objection
                      <br />
                      In accordance with Article 6:4 of the General Administrative Law Act...
                      <br /><br />
                      [Template continues with full content...]
                    </div>
                  )}
                  
                  {shipmentType === 'Extension Letter' && (
                    <div>
                      <strong style={{ color: '#8b5cf6' }}>Extension Request Letter Template:</strong>
                      <br />
                      Corporate Tax Filing {new Date().getFullYear()}
                      <br /><br />
                      [Company Letterhead]
                      <br />
                      Belastingdienst
                      <br />
                      [Relevant Tax Office Address]
                      <br />
                      [Postal Code and City]
                      <br />
                      The Netherlands
                      <br /><br />
                      Date: [Insert Date]
                      <br />
                      Subject: Request for Extension of Filing Period - Corporate Tax Return {new Date().getFullYear()}
                      <br />
                      RSIN/KVK Number: [Your RSIN]/[Your KVK]
                      <br />
                      Tax Reference Number: [Insert Reference Number]
                      <br />
                      Tax Year: {new Date().getFullYear()}
                      <br />
                      Current Filing Deadline: [Insert Current Deadline]
                      <br /><br />
                      Dear Sir/Madam,
                      <br /><br />
                      1. Formal Request for Extension
                      <br />
                      Pursuant to Article 9 of the General State Taxes Act...
                      <br /><br />
                      [Template continues with full content...]
                    </div>
                  )}
                  
                  {shipmentType === 'Payment Plan Request Letter' && (
                    <div>
                      <strong style={{ color: '#8b5cf6' }}>Payment Plan Request Letter Template:</strong>
                      <br />
                      Corporate Tax {new Date().getFullYear()}
                      <br /><br />
                      [Company Letterhead]
                      <br />
                      Belastingdienst
                      <br />
                      [Relevant Tax Office Address]
                      <br />
                      [Postal Code and City]
                      <br />
                      The Netherlands
                      <br /><br />
                      Date: [Insert Date]
                      <br />
                      Subject: Request for Payment Plan (Betalingsregeling) - Corporate Tax {new Date().getFullYear()}
                      <br />
                      RSIN/KVK Number: [Your RSIN]/[Your KVK]
                      <br />
                      Tax Reference Number: [Insert Reference Number]
                      <br />
                      Tax Year: {new Date().getFullYear()}
                      <br />
                      Assessment Date: [Insert Date of Assessment]
                      <br />
                      Assessment Amount: €[Insert Amount]
                      <br />
                      Due Date: [Insert Current Payment Deadline]
                      <br /><br />
                      Dear Sir/Madam,
                      <br /><br />
                      1. Formal Request for Payment Plan
                      <br />
                      Pursuant to Article 25 of the Tax Collection Act...
                      <br /><br />
                      [Template continues with full content...]
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <button type="submit" className="create-shipment-btn" style={{marginTop: '2rem', background: '#FF4B7E', color: 'white', fontWeight: 600, fontSize: '1.2rem', borderRadius: '16px', padding: '0.8rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.7rem', border: 'none'}}>
            <FaShippingFast /> Create Shipment
          </button>
        </form>
      )}
      {activeTab === 'shipments' && (
        <div className="shipments-tab" style={{marginTop: '2rem'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Outgoing Shipments</h2>
            <button 
              onClick={() => fetchShipments()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: 'rgba(60, 40, 100, 0.7)',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
          </div>
          {shipments.length === 0 && <p>No outgoing shipments found.</p>}
          {shipments.length > 0 && (
            <table className="shipments-table" style={{width: '100%', background: 'rgba(30, 20, 60, 0.5)', borderRadius: '16px', color: 'white', borderCollapse: 'collapse', marginTop: '1.5rem'}}>
              <thead>
                <tr style={{background: 'rgba(60, 40, 100, 0.7)'}}>
                  <th style={{padding: '1rem', textAlign: 'left'}}>Recipient</th>
                  <th style={{padding: '1rem', textAlign: 'left'}}>Address</th>
                  <th style={{padding: '1rem', textAlign: 'left'}}>Type</th>
                  <th style={{padding: '1rem', textAlign: 'left'}}>Contents</th>
                  <th style={{padding: '1rem', textAlign: 'left'}}>Delivery Method</th>
                  <th style={{padding: '1rem', textAlign: 'left'}}>Tracking</th>
                  <th style={{padding: '1rem', textAlign: 'left'}}>Scheduled Date</th>
                  <th style={{padding: '1rem', textAlign: 'left'}}>Documents</th>
                  <th style={{padding: '1rem', textAlign: 'center'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                  {shipments.map(shipment => (
                  <tr key={shipment.id}>
                    <td data-label="Recipient">{shipment.recipient}</td>
                    <td data-label="Address">{shipment.address}</td>
                    <td data-label="Type">{shipment.type}</td>
                    <td data-label="Contents">{shipment.contents}</td>
                    <td data-label="Delivery Method">{shipment.deliveryMethod}</td>
                    <td data-label="Tracking">
                      {[
                        shipment.tracking && 'Tracking',
                        shipment.deliveryConfirmation && 'Confirmation',
                        shipment.insurance && 'Insurance'
                      ].filter(Boolean).join(', ') || 'None'}
                    </td>
                    <td data-label="Scheduled Date">{shipment.scheduledDate}</td>
                    <td data-label="Documents">
                      {shipment.documents?.length > 0 ? (
                        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                          {shipment.documents.map((doc, index) => (
                            <div key={index} style={{display: 'flex', gap: '0.3rem'}}>
                              <button
                                onClick={() => handleViewShipmentDoc(doc)}
                                title={doc.name}
                                style={{
                                  padding: '0.4rem',
                                  background: '#29295a',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                <FaEye color="white" size={14} />
                              </button>
                              <button
                                onClick={() => handleDownloadShipmentDoc(doc)}
                                title="Download"
                                style={{
                                  padding: '0.4rem',
                                  background: '#29295a',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                <FaDownload color="white" size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{color: '#666'}}>No documents</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span style={{
                        background: getStatusColor(shipment.status),
                        color: 'white',
                        borderRadius: '12px',
                        padding: '0.3rem 1rem',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                      }}>
                        {shipment.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Unread Tab */}
      {activeTab === 'unread' && (
        <div className="unread-tab" style={{ marginTop: '2rem' }}>
          <h2>Unread Documents</h2>
          <p style={{ color: '#b8b8ff', marginBottom: '2rem' }}>
            View and manage your unread documents and notifications
          </p>
          
          {/* Unread Statistics */}
          <div style={{ 
            background: 'rgba(30, 20, 60, 0.5)', 
            padding: '1.5rem', 
            borderRadius: '16px', 
            marginBottom: '2rem',
            border: '1px solid rgba(60, 40, 100, 0.3)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#FF8800' }}>📊 Unread Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF4B7E' }}>
                  {incomingMail.filter(mail => !mail.read).length}
                </div>
                <div style={{ color: '#ccc' }}>Unread Incoming</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF8800' }}>
                  {outgoingEmails.filter(email => !email.read).length}
                </div>
                <div style={{ color: '#ccc' }}>Unread Outgoing</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                  {shipments.filter(shipment => !shipment.read).length}
                </div>
                <div style={{ color: '#ccc' }}>Unread Shipments</div>
              </div>
            </div>
          </div>

          {/* Mark All as Read Button */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}>
              📖 Mark All as Read
            </button>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="settings-tab" style={{ marginTop: '2rem' }}>
          <h2>Mailbox Settings</h2>
          <p style={{ color: '#b8b8ff', marginBottom: '2rem' }}>
            Configure your mailbox preferences and notification settings
          </p>
          
          {/* Settings Categories */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* Notification Settings */}
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>🔔 Notifications</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                  <input type="checkbox" defaultChecked /> Email notifications
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                  <input type="checkbox" defaultChecked /> Push notifications
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                  <input type="checkbox" /> SMS notifications
                </label>
              </div>
            </div>

            {/* Auto-Forward Settings */}
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#FF8800' }}>📧 Auto-Forward</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                  <input type="checkbox" defaultChecked /> Forward incoming mail
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                  <input type="checkbox" /> Auto-scan documents
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                  <input type="checkbox" defaultChecked /> AI analysis alerts
                </label>
              </div>
            </div>

            {/* Storage Settings */}
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#FF4B7E' }}>💾 Storage</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ color: '#ccc' }}>
                  <div>Used: 2.4 GB</div>
                  <div>Total: 10 GB</div>
                </div>
                <button style={{
                  background: 'rgba(60, 40, 100, 0.7)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  Clean Up
                </button>
              </div>
            </div>
          </div>

          {/* Save Settings Button */}
          <div style={{ textAlign: 'center' }}>
            <button style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}>
              💾 Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Corporate Analysis Tab */}
      {activeTab === 'corporate-analysis' && (
        <div className="corporate-analysis-tab" style={{ marginTop: '2rem' }}>
          <h2>Corporate Tax Analysis</h2>
          <p style={{ color: '#b8b8ff', marginBottom: '2rem' }}>
            View and manage your corporate tax analysis results and insights
          </p>
          
          {/* Loading State */}
          {loadingCorporateAnalysis && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1rem' }}></div>
              <p>Loading corporate tax analysis...</p>
            </div>
          )}
          
          {/* Error State */}
          {corporateAnalysisError && (
            <div style={{ 
              background: 'rgba(220, 38, 38, 0.1)', 
              border: '1px solid #dc2626', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginBottom: '2rem',
              color: '#fca5a5'
            }}>
              Error loading analysis: {corporateAnalysisError}
            </div>
          )}

          {/* Display Existing Corporate Tax Analysis */}
          {corporateAnalysis && (
            <div style={{ 
              background: '#23244d', 
              borderRadius: '16px', 
              padding: '2rem', 
              marginBottom: '2rem',
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '1rem' }}>
                  Your Corporate Tax Analysis
                </h3>
                <p style={{ color: '#bfc9da', fontSize: '1.1rem' }}>
                  Analysis completed on {new Date(corporateAnalysis.created_at).toLocaleDateString()}
                </p>
              </div>

              <div style={{ 
                background: '#1e293b', 
                borderRadius: '12px', 
                padding: '2rem',
                marginBottom: '2rem',
                border: '1px solid #3a3b5a'
              }}>
                {/* Display existing analysis data */}
                <div style={{ display: 'grid', gap: '2rem' }}>
                  {/* Company Information */}
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
                      Company Information
                    </h4>
                    <div style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.8' }}>
                      <p style={{ margin: '0 0 0.5rem 0' }}>
                        <strong>Company:</strong> {corporateAnalysis.company_name || 'N/A'}
                      </p>
                      <p style={{ margin: '0' }}>
                        <strong>Fiscal Year:</strong> {corporateAnalysis.fiscal_year || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Financial Summary */}
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
                      <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>Item</div>
                      <div style={{ color: '#d1d5db', fontWeight: 'bold', borderBottom: '1px solid #4b5563', paddingBottom: '0.5rem' }}>Amount</div>
                      
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Revenue</div>
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{formatCurrency(corporateAnalysis.revenue)}</div>
                      
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Expenses</div>
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{formatCurrency(corporateAnalysis.expenses)}</div>
                      
                      <div style={{ color: '#10b981', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #4b5563', paddingTop: '0.5rem' }}>Taxable Income</div>
                      <div style={{ color: '#10b981', padding: '0.5rem 0', fontWeight: 'bold', borderTop: '1px solid #4b5563', paddingTop: '0.5rem' }}>{formatCurrency(corporateAnalysis.taxable_income)}</div>
                      
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>Final Tax Owed</div>
                      <div style={{ color: '#d1d5db', padding: '0.5rem 0' }}>{formatCurrency(corporateAnalysis.final_tax_owed)}</div>
                    </div>
                  </div>

                  {/* Additional Analysis Data */}
                  {corporateAnalysis.observations && (
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
                        Analysis Observations
                      </h4>
                      <div style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.6' }}>
                        {Array.isArray(corporateAnalysis.observations) ? (
                          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                            {corporateAnalysis.observations.map((obs, index) => (
                              <li key={index} style={{ marginBottom: '0.5rem' }}>{obs}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ margin: 0 }}>{corporateAnalysis.observations}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {corporateAnalysis.recommendations && (
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
                        Recommendations
                      </h4>
                      <div style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.6' }}>
                        {Array.isArray(corporateAnalysis.recommendations) ? (
                          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                            {corporateAnalysis.recommendations.map((rec, index) => (
                              <li key={index} style={{ marginBottom: '0.5rem' }}>{rec}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ margin: 0 }}>{corporateAnalysis.recommendations}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Raw Analysis Data */}
                  {corporateAnalysis.raw_analysis_data && (
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
                        Raw Analysis Data
                      </h4>
                      <div style={{ 
                        background: '#1f2937', 
                        borderRadius: '6px', 
                        padding: '1rem',
                        maxHeight: '300px',
                        overflow: 'auto'
                      }}>
                        <pre style={{ 
                          color: '#d1d5db', 
                          fontSize: '0.85rem',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {JSON.stringify(JSON.parse(corporateAnalysis.raw_analysis_data || '{}'), null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        navigate('/comprehensive-tax-dashboard');
                      }}
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
                      Start New Analysis
                    </button>
                    <button
                      onClick={() => {
                        fetchCorporateTaxAnalysis();
                      }}
                      style={{
                        background: 'rgba(60, 40, 100, 0.7)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Refresh Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Corporate Tax Reports Section */}
          {corporateTaxReports && corporateTaxReports.length > 0 && (
            <div style={{ 
              background: '#23244d', 
              borderRadius: '16px', 
              padding: '2rem', 
              marginBottom: '2rem',
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '1rem' }}>
                  📄 Generated Corporate Tax Reports
                </h3>
                <p style={{ color: '#bfc9da', fontSize: '1.1rem' }}>
                  View and download your completed corporate tax analysis reports
                </p>
                <button 
                  onClick={() => {
                    if (corporateAnalysis) {
                      fetchCorporateTaxReports(corporateAnalysis.user_id);
                    }
                  }}
                  style={{
                    background: 'rgba(60, 40, 100, 0.7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(60, 40, 100, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(60, 40, 100, 0.7)';
                  }}
                >
                  🔄 Refresh Reports
                </button>
          </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                {corporateTaxReports.map((report, index) => (
                  <div key={report.id} style={{
                    background: '#1e293b',
                    borderRadius: '12px',
            padding: '1.5rem', 
                    border: '1px solid #3a3b5a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ 
                        color: '#fff', 
                        margin: '0 0 0.5rem 0',
                        fontSize: '1.1rem',
                        fontWeight: '600'
                      }}>
                        {report.company_name || 'Company'} - {report.fiscal_year || 'Year'}
                      </h4>
                      <div style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        fontSize: '0.9rem', 
                        color: '#9ca3af' 
                      }}>
                        <span>📅 Generated: {new Date(report.created_at).toLocaleDateString()}</span>
                        {report.taxable_income && (
                          <span>💰 Taxable Income: {formatCurrency(report.taxable_income)}</span>
                        )}
                        {report.final_tax_owed && (
                          <span>💸 Tax Owed: {formatCurrency(report.final_tax_owed)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      marginLeft: '1rem' 
                    }}>
                      <button
                        onClick={() => window.open(report.report_url, '_blank')}
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
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#059669';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#10b981';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        👁️ View Report
                    </button>
                      <button
                        onClick={() => {
                          // Create a download link for the PDF
                          const link = document.createElement('a');
                          link.href = report.report_url;
                          link.download = `Corporate_Tax_Report_${report.company_name || 'Company'}_${report.fiscal_year || 'Year'}.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        style={{
                          background: '#3b82f6',
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
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#1d4ed8';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#3b82f6';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        ⬇️ Download
                    </button>
          </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Reports Available Message */}
          {corporateAnalysis && (!corporateTaxReports || corporateTaxReports.length === 0) && (
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.3)', 
              borderRadius: '16px', 
              padding: '2rem', 
              marginBottom: '2rem',
              textAlign: 'center',
              border: '1px solid rgba(60, 40, 100, 0.2)'
            }}>
              <h4 style={{ color: '#bfc9da', marginBottom: '1rem' }}>
                📄 No Generated Reports Yet
              </h4>
              <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: '1rem' }}>
                You have completed corporate tax analysis, but no PDF reports have been generated yet.
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                Generate a PDF report from your analysis to view and download it here.
              </p>
            </div>
          )}
        </div>
      )}
        </div>
      </div>

              {/* Create Channel Modal */}
        {showCreateChannelModal && (
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
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: '#1e293b',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              border: '1px solid rgba(60, 40, 100, 0.3)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <h2 style={{ color: '#fff', margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>
                  Create Channel
                </h2>
                <button
                  onClick={() => setShowCreateChannelModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Form Content */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem',
                marginBottom: '2rem'
              }}>
                {/* Left Panel - Channel Details */}
                <div style={{
                  background: 'rgba(30, 20, 60, 0.3)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(60, 40, 100, 0.2)'
                }}>
                  <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                    Channel Details
                  </h3>
                  
                  {/* Title */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#b8b8ff', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={channelFormData.title}
                      onChange={handleChannelFormChange}
                      placeholder="e.g., Corporate Tax 2025"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2d3748',
                        border: '1px solid rgba(60, 40, 100, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  {/* Process Type */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#b8b8ff', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Process Type
                    </label>
                    <select
                      name="processType"
                      value={channelFormData.processType}
                      onChange={handleChannelFormChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2d3748',
                        border: '1px solid rgba(60, 40, 100, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="Corporate Tax">Corporate Tax</option>
                      <option value="VAT Return">VAT Return</option>
                      <option value="Branch Registration">Branch Registration</option>
                      <option value="KYC">KYC</option>
                      <option value="Legal Agreements">Legal Agreements</option>
                      <option value="Shipments">Shipments</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#b8b8ff', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={channelFormData.priority}
                      onChange={handleChannelFormChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2d3748',
                        border: '1px solid rgba(60, 40, 100, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#b8b8ff', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={channelFormData.dueDate}
                      onChange={handleChannelFormChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2d3748',
                        border: '1px solid rgba(60, 40, 100, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                {/* Right Panel - Auto-Attach Documents */}
                <div style={{
                  background: 'rgba(30, 20, 60, 0.3)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(60, 40, 100, 0.2)'
                }}>
                  <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                    Auto-Attach Documents
                  </h3>
                  
                  {/* Detect by Reference */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#b8b8ff', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Detect by Reference
                    </label>
                    <input
                      type="text"
                      name="detectByReference"
                      value={channelFormData.detectByReference}
                      onChange={handleChannelFormChange}
                      placeholder="e.g., V.01, U01"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2d3748',
                        border: '1px solid rgba(60, 40, 100, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  {/* Tax ID / RSIN */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#b8b8ff', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Tax ID / RSIN
                    </label>
                    <input
                      type="text"
                      name="taxIdRsin"
                      value={channelFormData.taxIdRsin}
                      onChange={handleChannelFormChange}
                      placeholder="e.g., NL123456789B01"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2d3748',
                        border: '1px solid rgba(60, 40, 100, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  {/* Company Name */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#b8b8ff', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={channelFormData.companyName}
                      onChange={handleChannelFormChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2d3748',
                        border: '1px solid rgba(60, 40, 100, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-start'
              }}>
                <button
                  onClick={handlePreviewChannel}
                  style={{
                    background: 'linear-gradient(135deg, #FF4B7E 0%, #FF6B9D 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Preview Channel
                </button>
                <button
                  onClick={handleCreateChannel}
                  style={{
                    background: 'linear-gradient(135deg, #FF6B9D 0%, #FF8BB3 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Create
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Render the Analysis Modal */}
      <AnalysisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        analysisData={analyzedMail}
      />
    </div>
  );
};

export default Mailbox;
