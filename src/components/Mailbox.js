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
  
  const [activeTab, setActiveTab] = useState('incoming');
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
          hasAnalysis: !!(mail.deadlines || mail.recommendations || mail.summary)
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
      // First try to get a signed URL which will work even for private buckets
      const { data: signedData, error: signedError } = await supabase.storage
        .from('mails-storage')
        .createSignedUrl(mail.filePath, 3600); // URL valid for 1 hour

      if (signedError) {
        // If signed URL fails, try to get public URL as fallback
        const { data: publicData } = await supabase.storage
          .from('mails-storage')
          .getPublicUrl(mail.filePath);

        if (publicData?.publicUrl) {
          window.open(publicData.publicUrl, '_blank', 'noopener,noreferrer');
        } else {
          throw new Error('Could not get URL for file');
        }
      } else {
        // Use the signed URL if available
        window.open(signedData.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error viewing mail:', error.message);
      alert('Failed to view document. Please ensure you have proper permissions.');
    }
  };

  const handleAnalyzeMail = async (mail) => {
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
    } else if (data && data.length > 0) {
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
          }).sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline); // Sort by urgency
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
            // Determine category and priority based on content
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
    } else {
       console.log('No analysis data found for mail ID:', mail.id);
       alert('No analysis data found for this mail.');
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
    switch (shipmentType) {
      case 'Objection Letter':
        docUrl = '/src/Objection Letter Template.docx'; // Use local file path
        break;
      case 'Extension Letter':
        docUrl = '/src/Extension Request Letter1.docx'; // Use local file path for Extension Letter
        break;
      case 'Payment Plan Request Letter':
        docUrl = '/src/Payment Plan Request Letter.docx'; // Use local file path for Payment Plan Request Letter
        break;
      default:
        console.error('Unknown shipment type:', shipmentType);
        return;
    }
    // For local files, opening the path in a new tab might prompt download or open based on browser/environment.
    window.open(docUrl, '_blank');
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

  return (
    <div className="mailbox-container">
      <h1>Inbox</h1>
      <p>Manage your physical and digital mail</p>
      <div className="mailbox-actions">
        <button className={activeTab === 'incoming' ? 'active' : ''} onClick={() => setActiveTab('incoming')}>Incoming Mail</button>
        <button className={activeTab === 'outgoing-email' ? 'active' : ''} onClick={() => setActiveTab('outgoing-email')}>Outgoing Email</button>
        <button className={activeTab === 'shipment' ? 'active' : ''} onClick={() => setActiveTab('shipment')}>Prepare Shipment</button>
        <button className={activeTab === 'shipments' ? 'active' : ''} onClick={() => setActiveTab('shipments')}>Shipments</button>
        <button className={activeTab === 'vat-return' ? 'active' : ''} onClick={() => setActiveTab('vat-return')}>VAT Return</button>
        <button className={activeTab === 'corporate-tax' ? 'active' : ''} onClick={() => setActiveTab('corporate-tax')}>Corporate Tax</button>
        <button className={activeTab === 'statutory-documents' ? 'active' : ''} onClick={() => setActiveTab('statutory-documents')}>Statutory Documents</button>
        <button className={activeTab === 'services' ? 'active' : ''} onClick={() => setActiveTab('services')}>Mailbox Services</button>
      </div>
      {activeTab === 'incoming' && (
        <>
          <div className="mailbox-toolbar">
            <input placeholder="Search mail..." />
            <button>AI Analysis</button>
            <button>Filter</button>
            <button>Scan All</button>
            <button>Forward All</button>
            <button 
              onClick={createSampleData}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Load Sample Data
            </button>
          </div>
          <div className="mailbox-list">
            <div className="mailbox-list-header">
              <span>Mail Details</span>
              <span>Received</span>
              <span>Actions</span>
            </div>
            {incomingMail.map(mail => (
              <div className="mailbox-list-item" key={mail.id}>
                <span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <strong>{mail.sender}</strong>
                    {/* Priority indicator */}
                    {mail.deadlinePriority === 'high' && (
                      <span style={{ 
                        background: '#ff4444', 
                        color: 'white', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        URGENT
                      </span>
                    )}
                    {mail.deadlinePriority === 'medium' && (
                      <span style={{ 
                        background: '#ff8800', 
                        color: 'white', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        SOON
                      </span>
                    )}
                    {mail.hasAnalysis && (
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
                  </div>
                  
                  <div style={{ marginBottom: '0.5rem' }}>{mail.subject}</div>
                  
                  {/* Extracted data display */}
                  {mail.extractedData && Object.keys(mail.extractedData).length > 0 && (
                    <div style={{ 
                      background: 'rgba(60, 40, 100, 0.3)', 
                      padding: '0.5rem', 
                      borderRadius: '8px', 
                      fontSize: '0.85rem',
                      marginBottom: '0.5rem'
                    }}>
                      {mail.extractedData.amount && (
                        <div style={{ color: '#FF4B7E', fontWeight: 'bold' }}>
                          Amount: €{mail.extractedData.amount}
                        </div>
                      )}
                      {mail.extractedData.due_date && (
                        <div style={{ color: '#FFB300' }}>
                          Due: {new Date(mail.extractedData.due_date).toLocaleDateString()}
                        </div>
                      )}
                      {mail.extractedData.document_type && (
                        <div style={{ color: '#4CAF50' }}>
                          Type: {mail.extractedData.document_type}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Priority tags */}
                  {mail.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {mail.tags.map(tag => (
                        <span 
                          className="mail-tag" 
                          key={tag}
                          style={{
                            background: tag.includes('€') ? '#FF4B7E' : 
                                       tag.includes('Due:') ? '#FFB300' : 
                                       'rgba(60, 40, 100, 0.7)',
                            color: 'white',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </span>
                <span>{mail.date}</span>
                <span>
                  <button title="Download" onClick={() => handleDownloadMail(mail)}><FaDownload /></button>
                  <button title="AI Analysis" onClick={() => handleAnalyzeMail(mail)}><FaRobot /></button>
                  <button title="View" onClick={() => handleViewMail(mail)}><HiOutlineExternalLink /></button>
                </span>
              </div>
            ))}
          </div>
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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* Corporate Tax Status Card */}
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#FF8800' }}>🏢 Current Tax Year</h3>
              <div style={{ marginBottom: '1rem' }}>
                <strong>2023</strong>
                <div style={{ color: '#FF8800', fontSize: '0.9rem' }}>Status: Pending</div>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                <div>Due Date: 31/03/2024</div>
                <div>Estimated Amount: €15,750.00</div>
                <div>Filing Status: Not Filed</div>
              </div>
            </div>

            {/* Corporate Tax Actions Card */}
            <div style={{ 
              background: 'rgba(30, 20, 60, 0.5)', 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(60, 40, 100, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>⚡ Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button style={{
                  background: '#FF8800',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>
                  📝 File Corporate Tax Return
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
                  📊 Tax Calculation Tool
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
                  💰 Payment Management
                </button>
              </div>
            </div>
          </div>

          {/* Corporate Tax Table */}
          <div style={{ 
            background: 'rgba(30, 20, 60, 0.5)', 
            padding: '1.5rem', 
            borderRadius: '16px',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Corporate Tax History</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Tax Year</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Due Date</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Amount</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Status</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', color: '#b8b8ff' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.8rem' }}>2023</td>
                  <td style={{ padding: '0.8rem' }}>31/03/2024</td>
                  <td style={{ padding: '0.8rem', color: '#FF8800', fontWeight: 'bold' }}>€15,750.00</td>
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
                      File Return
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
                      Calculate
                    </button>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.8rem' }}>2022</td>
                  <td style={{ padding: '0.8rem' }}>31/03/2023</td>
                  <td style={{ padding: '0.8rem', color: '#4CAF50', fontWeight: 'bold' }}>€12,300.00</td>
                  <td style={{ padding: '0.8rem' }}>
                    <span style={{ 
                      background: '#4CAF50', 
                      color: 'white', 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem' 
                    }}>
                      Filed
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
              </tbody>
            </table>
          </div>
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
                <select value={shipmentType} onChange={e => setShipmentType(e.target.value)} className="mailbox-input">
                  <option value="Objection Letter">Objection Letter</option>
                  <option value="Extension Letter">Extension Letter</option>
                  <option value="Payment Plan Request Letter">Payment Plan Request Letter</option>
                </select>
              </div>
              {shipmentType && (
                <div style={{marginTop: '0.5rem', padding: '1.2rem', background: 'rgba(60, 40, 100, 0.5)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{flexGrow: 1}}>
                    <h4 style={{marginTop: 0, marginBottom: 0, marginRight: '1rem', display: 'inline-block'}}>{shipmentType}</h4>
                  </div>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    {/* Download button for all letter types */}
                    <button 
                       onClick={handleDownloadShipmentDocument}
                       style={{padding: '0.5rem 0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer'}}
                    >
                      <MdOutlineDownload /> 
                    </button>
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
                        gap: '0.4rem'
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
