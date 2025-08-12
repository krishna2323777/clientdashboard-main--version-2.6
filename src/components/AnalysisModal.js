import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useNavigate } from 'react-router-dom';


const AnalysisModal = ({ isOpen, onClose, analysisData }) => {
  const modalContentRef = useRef(null);
  const navigate = useNavigate();

  if (!isOpen || !analysisData) {
    return null;
  }
// Helper to format the date for deadlines (e.g., "June 1, 2021" or "12/15/2023")
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // If the date is already in a readable format like "June 1, 2021", return it as is
      if (dateString.includes(',') && dateString.match(/[A-Za-z]+ \d+, \d{4}/)) {
        return dateString;
      }
      
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      } else {
        // Fallback if date parsing fails
        return dateString;
      }
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  // Render deadlines with priority indicators and enhanced formatting
  const renderDeadlines = (deadlines) => {
    if (!deadlines || deadlines.length === 0) {
      return <p style={{ color: '#ccc', fontSize: '0.9rem' }}>No deadlines found.</p>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {deadlines.map((deadline, index) => {
          const getPriorityColor = (priority) => {
            switch (priority) {
              case 'high': return '#ff4444';
              case 'medium': return '#ff8800';
              case 'low': return '#4CAF50';
              default: return '#6C5DD3';
            }
          };

          const getPriorityIcon = (priority) => {
            switch (priority) {
              case 'high': return '🚨';
              case 'medium': return '⚠️';
              case 'low': return '📅';
              default: return '📅';
            }
          };

          return (
            <div key={index} style={{
              ...deadlineItemStyle,
              border: `2px solid ${getPriorityColor(deadline.priority)}`,
              borderRadius: '8px',
              padding: '12px',
              background: `${getPriorityColor(deadline.priority)}20`
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{getPriorityIcon(deadline.priority)}</span>
                  <span style={{ fontWeight: 'bold' }}>
              {deadline.type || deadline.description || 'N/A'}
            </span>
                  <span style={{
                    background: getPriorityColor(deadline.priority),
                    color: 'white',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    {deadline.priority}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    ...deadlineDateStyle(false),
                    background: deadline.isOverdue ? '#ff4444' : getPriorityColor(deadline.priority)
                  }}>
              {deadline.date ? formatDate(deadline.date) : 'N/A'}
            </span>
                  
                  {deadline.daysUntilDeadline !== undefined && (
                    <span style={{
                      color: deadline.isOverdue ? '#ff4444' : '#ccc',
                      fontSize: '0.85rem',
                      fontWeight: deadline.isOverdue ? 'bold' : 'normal'
                    }}>
                      {deadline.isOverdue 
                        ? `Overdue by ${Math.abs(deadline.daysUntilDeadline)} days`
                        : `${deadline.daysUntilDeadline} days remaining`
                      }
                    </span>
                  )}
                </div>
              </div>
          </div>
          );
        })}
      </div>
    );
  };

  // Render categorized recommendations with priority indicators
  const renderRecommendations = (recommendations, groupedRecommendations) => {
    if (!recommendations || recommendations.length === 0) {
      return <p style={{ color: '#ccc', fontSize: '0.9rem' }}>No recommendations found.</p>;
    }

    // If we have grouped recommendations, display them by category
    if (groupedRecommendations && Object.keys(groupedRecommendations).length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {Object.entries(groupedRecommendations).map(([category, recs]) => (
            <div key={category} style={{
              background: 'rgba(60, 40, 100, 0.3)',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid rgba(60, 40, 100, 0.5)'
            }}>
              <h4 style={{
                margin: '0 0 10px 0',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {getCategoryIcon(category)} {category}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recs.map((rec, index) => (
                  <li key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '0.95rem',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    border: `1px solid ${getPriorityColor(rec.priority)}`
                  }}>
                    <span style={{ color: getPriorityColor(rec.priority), fontSize: '1.2rem' }}>
                      {getPriorityIcon(rec.priority)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', marginBottom: '4px' }}>{rec.text}</div>
                      <span style={{
                        background: getPriorityColor(rec.priority),
                        color: 'white',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {rec.priority}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    // Fallback to simple list if no grouping
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {recommendations.map((recommendation, index) => (
          <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.95rem' }}>
            <span style={{ color: '#4CAF50', fontSize: '1.2rem' }}>✔️</span>
            {recommendation}
          </li>
        ))}
      </ul>
    );
  };

  // Helper function to get category icon
  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'financial': return '💰';
      case 'administrative': return '📋';
      case 'tax': return '🧾';
      case 'penalty': return '⚠️';
      case 'legal': return '⚖️';
      default: return '💡';
    }
  };

  // Helper function to get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ff8800';
      case 'low': return '#4CAF50';
      default: return '#6C5DD3';
    }
  };

  // Helper function to get priority icon
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '✅';
      default: return '💡';
    }
  };

  // Function to handle the download of analysis
  const handleDownloadAnalysis = () => {
    if (!modalContentRef.current) return;

    html2canvas(modalContentRef.current, {
        scale: 2, // Increase scale for better resolution
        useCORS: true, // Enable CORS if needed for images
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height] // Set PDF size to canvas size
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('document_analysis.pdf');
    });
  };



  // Function to handle creating a task
  const handleCreateTask = () => {
    // Prepare the task data from analysis
    const taskData = {
      title: analysisData.document_type || 'Document Analysis Task',
      description: analysisData.summary || 'Document analysis task created from mailbox',
      type: getTaskTypeFromDocument(analysisData.document_type),
      due_date: getEarliestDeadline(analysisData.deadlines),
      priority: getPriorityFromDeadlines(analysisData.deadlines),
      status: 'Pending',
      assigned_to: '',
      deadlines: analysisData.deadlines,
      recommendations: analysisData.recommendations
    };

    // Store the task data in sessionStorage for the calendar component to access
    sessionStorage.setItem('pendingTaskData', JSON.stringify(taskData));
    
    // Close the modal
    onClose();
    
    // Navigate to calendar route
    navigate('/calendar');
  };

  // Helper function to determine task type from document type
  const getTaskTypeFromDocument = (documentType) => {
    if (!documentType) return 'Company';
    
    const lowerType = documentType.toLowerCase();
    if (lowerType.includes('tax') || lowerType.includes('vat')) return 'Tax';
    if (lowerType.includes('finance') || lowerType.includes('invoice')) return 'Finance';
    if (lowerType.includes('legal') || lowerType.includes('agreement')) return 'Legal Agreements';
    if (lowerType.includes('shipment') || lowerType.includes('mail')) return 'Shipments';
    if (lowerType.includes('kyc') || lowerType.includes('verification')) return 'KYC';
    
    return 'Company';
  };

  // Helper function to get the earliest deadline
  const getEarliestDeadline = (deadlines) => {
    if (!deadlines || deadlines.length === 0) {
      // Default to 7 days from now if no deadlines
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      return defaultDate.toISOString().split('T')[0];
    }

    // Find the earliest deadline
    const validDeadlines = deadlines.filter(d => d.date);
    if (validDeadlines.length === 0) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      return defaultDate.toISOString().split('T')[0];
    }

    const earliest = validDeadlines.reduce((earliest, current) => {
      const earliestDate = new Date(earliest.date);
      const currentDate = new Date(current.date);
      return earliestDate < currentDate ? earliest : current;
    });

    return new Date(earliest.date).toISOString().split('T')[0];
  };

  // Helper function to determine priority based on deadlines
  const getPriorityFromDeadlines = (deadlines) => {
    if (!deadlines || deadlines.length === 0) return 'Medium';

    const now = new Date();
    const urgentDeadlines = deadlines.filter(d => {
      if (!d.date) return false;
      const deadlineDate = new Date(d.date);
      const daysUntilDeadline = (deadlineDate - now) / (1000 * 60 * 60 * 24);
      return daysUntilDeadline <= 7; // High priority if deadline is within 7 days
    });

    return urgentDeadlines.length > 0 ? 'High' : 'Medium';
  };

  return (
    <div className="modal-overlay" style={modalOverlayStyle}>
      <div className="modal-content" style={modalContentStyle} ref={modalContentRef}>
        {/* Modal Header */}
        <div style={modalHeaderStyle}>
          <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🧠</span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '600', margin: 0 }}>AI Document Analysis</h2>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        {/* Document Metadata Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Document Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={infoCardStyle}>
              <p style={infoLabelStyle}>Document Name</p>
              <p style={infoValueStyle}>{analysisData.documentMetadata?.name || analysisData.document_name || 'N/A'}</p>
            </div>
            <div style={infoCardStyle}>
              <p style={infoLabelStyle}>Document Type</p>
              <p style={infoValueStyle}>{analysisData.documentMetadata?.type || analysisData.document_type || 'N/A'}</p>
            </div>
            <div style={infoCardStyle}>
              <p style={infoLabelStyle}>Issue Date</p>
              <p style={infoValueStyle}>
                {analysisData.documentMetadata?.issueDate 
                  ? new Date(analysisData.documentMetadata.issueDate).toLocaleDateString() 
                  : 'N/A'
                }
              </p>
            </div>
            <div style={infoCardStyle}>
              <p style={infoLabelStyle}>Received Date</p>
              <p style={infoValueStyle}>
                {analysisData.documentMetadata?.createdAt 
                  ? new Date(analysisData.documentMetadata.createdAt).toLocaleDateString() 
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Extracted Data Section */}
        {analysisData.extractedData && Object.keys(analysisData.extractedData).length > 0 && (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Extracted Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {/* Financial Information */}
              {analysisData.extractedData.amount && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>💰 Amount</p>
                  <p style={{...infoValueStyle, color: '#FF4B7E', fontSize: '1.1rem', fontWeight: 'bold'}}>
                    €{analysisData.extractedData.amount}
                  </p>
                </div>
              )}
              {analysisData.extractedData.currency && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>💱 Currency</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.currency}</p>
                </div>
              )}
              {analysisData.extractedData.tax_amount && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>🧾 Tax Amount</p>
                  <p style={{...infoValueStyle, color: '#FF8800'}}>€{analysisData.extractedData.tax_amount}</p>
                </div>
              )}
              {analysisData.extractedData.total_amount && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>📊 Total Amount</p>
                  <p style={{...infoValueStyle, color: '#FF4B7E', fontWeight: 'bold'}}>€{analysisData.extractedData.total_amount}</p>
                </div>
              )}
              
              {/* Dates and Deadlines */}
              {analysisData.extractedData.due_date && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>⏰ Due Date</p>
                  <p style={{...infoValueStyle, color: '#FFB300', fontWeight: 'bold'}}>
                    {new Date(analysisData.extractedData.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {analysisData.extractedData.issue_date && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>📅 Issue Date</p>
                  <p style={infoValueStyle}>
                    {new Date(analysisData.extractedData.issue_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {analysisData.extractedData.payment_date && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>💳 Payment Date</p>
                  <p style={infoValueStyle}>
                    {new Date(analysisData.extractedData.payment_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {analysisData.extractedData.expiry_date && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>⏳ Expiry Date</p>
                  <p style={{...infoValueStyle, color: '#ff4444'}}>
                    {new Date(analysisData.extractedData.expiry_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              {/* Document Information */}
              {analysisData.extractedData.document_type && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>📄 Document Type</p>
                  <p style={{...infoValueStyle, color: '#4CAF50'}}>{analysisData.extractedData.document_type}</p>
                </div>
              )}
              {analysisData.extractedData.reference_number && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>🔢 Reference Number</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.reference_number}</p>
                </div>
              )}
              {analysisData.extractedData.invoice_number && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>🧾 Invoice Number</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.invoice_number}</p>
                </div>
              )}
              {analysisData.extractedData.case_number && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>📋 Case Number</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.case_number}</p>
                </div>
              )}
              
              {/* Company and Entity Information */}
              {analysisData.extractedData.company_name && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>🏢 Company Name</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.company_name}</p>
                </div>
              )}
              {analysisData.extractedData.tax_id && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>🆔 Tax ID</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.tax_id}</p>
                </div>
              )}
              {analysisData.extractedData.vat_number && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>🧾 VAT Number</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.vat_number}</p>
                </div>
              )}
              {analysisData.extractedData.kvk_number && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>🏛️ KVK Number</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.kvk_number}</p>
                </div>
              )}
              
              {/* Tax and Period Information */}
              {analysisData.extractedData.tax_period && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>📅 Tax Period</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.tax_period}</p>
                </div>
              )}
              {analysisData.extractedData.fiscal_year && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>📊 Fiscal Year</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.fiscal_year}</p>
                </div>
              )}
              {analysisData.extractedData.tax_rate && (
                <div style={infoCardStyle}>
                  <p style={infoLabelStyle}>📈 Tax Rate</p>
                  <p style={infoValueStyle}>{analysisData.extractedData.tax_rate}%</p>
                </div>
              )}
              
              {/* Additional Fields - Dynamic Rendering */}
              {Object.entries(analysisData.extractedData)
                .filter(([key, value]) => 
                  !['amount', 'currency', 'tax_amount', 'total_amount', 'due_date', 'issue_date', 
                    'payment_date', 'expiry_date', 'document_type', 'reference_number', 'invoice_number', 
                    'case_number', 'company_name', 'tax_id', 'vat_number', 'kvk_number', 'tax_period', 
                    'fiscal_year', 'tax_rate'].includes(key) && 
                  value !== null && value !== undefined && value !== ''
                )
                .map(([key, value]) => (
                  <div key={key} style={infoCardStyle}>
                    <p style={infoLabelStyle}>
                      {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </p>
                    <p style={infoValueStyle}>
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                       typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </p>
                  </div>
                ))
              }
            </div>
            

          </div>
        )}

        {/* Summary Section */}
        {analysisData.summary && (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>AI Summary</h3>
            <p style={{ color: '#ccc', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
              {analysisData.summary}
            </p>
          </div>
        )}

        {/* File Access Section */}
        {analysisData.documentMetadata?.filePath && (
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>File Access</h3>
            <div style={{
              background: 'rgba(60, 40, 100, 0.3)',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid rgba(60, 40, 100, 0.5)'
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  style={buttonStyle('#4CAF50')}
                  onClick={() => window.open(`/api/view-file?path=${encodeURIComponent(analysisData.documentMetadata.filePath)}`, '_blank')}
                >
                  📄 View File
                </button>
                <button 
                  style={buttonStyle('#6C5DD3')}
                  onClick={() => window.open(`/api/download-file?path=${encodeURIComponent(analysisData.documentMetadata.filePath)}`, '_blank')}
                >
                  ⬇️ Download File
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Important Deadlines Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Important Deadlines</h3>
          {renderDeadlines(analysisData.deadlines)}
        </div>

        {/* Recommendations Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Smart Recommendations</h3>
          {renderRecommendations(analysisData.recommendations, analysisData.groupedRecommendations)}
        </div>

         {/* Action Buttons */}
         {/* Functionality for these buttons is not implemented */}
         <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '15px', marginTop: '30px' }}>
             <button style={buttonStyle('#6C5DD3', true)} onClick={handleDownloadAnalysis}><span style={{marginRight: '8px'}}>⬇️</span> Download Analysis</button>
             <button style={buttonStyle('#FF4B7E')} onClick={handleCreateTask}>Create Task</button>
         </div>

      </div>
    </div>
  );
};

// --- Styles --- //

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '20px',
};

const modalContentStyle = {
  backgroundColor: '#1a1a2e',
  padding: '30px',
  borderRadius: '10px',
  width: '95%',
  maxWidth: '600px', // Adjusted max width slightly based on image proportion
  color: 'white',
  position: 'relative',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  maxHeight: '90vh', // Adjusted max height slightly
  overflowY: 'auto',
};

const modalHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    // justifyContent: 'space-between', // Removed space-between to match image closer
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #3a2a5d',
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  color: '#ccc',
  position: 'absolute',
  top: '15px',
  right: '15px',
  lineHeight: 1,
};

const sectionStyle = {
    backgroundColor: '#2a2a4a',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
};

const sectionTitleStyle = {
    fontSize: '1.1rem', // Adjusted font size
    fontWeight: '600',
    marginBottom: '15px',
    color: '#ffffff',
};

const deadlineItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #3a2a5d',
};

const deadlineDateStyle = (isPayment) => ({
  backgroundColor: isPayment ? '#FF4B7E' : '#6C5DD3', // Color based on boolean prop
  padding: '4px 10px',
  borderRadius: '12px',
  fontSize: '0.85rem',
  fontWeight: 'bold',
});

const infoCardStyle = {
    backgroundColor: '#3a3a5a',
    padding: '15px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
};

const infoLabelStyle = {
    fontSize: '0.85rem', // Adjusted font size
    color: '#ccc',
    margin: 0,
};

const infoValueStyle = {
    fontSize: '0.95rem', // Adjusted font size
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
};

const confidenceBadgeStyle = {
    backgroundColor: '#6C5DD3',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
};

const buttonStyle = (bgColor, outline = false) => ({
    backgroundColor: outline ? 'transparent' : bgColor,
    color: outline ? bgColor : 'white',
    border: outline ? `1px solid ${bgColor}` : 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem', // Adjusted font size
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.2s ease, opacity 0.2s ease',
     '&:hover': {
        opacity: 0.9,
     }
});

export default AnalysisModal; 