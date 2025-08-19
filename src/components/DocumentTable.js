import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const DocumentTable = ({ transactions, onDocumentDeleted }) => {
  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';
  
  // Track documents for display - use transactions from parent as primary source
  const [displayDocuments, setDisplayDocuments] = useState([]);
  
  // Update display documents whenever transactions change
  useEffect(() => {
    if (transactions && Array.isArray(transactions)) {
      setDisplayDocuments([...transactions]);
    } else {
      setDisplayDocuments([]);
    }
  }, [transactions]);
  
  // Show documents in reverse order (newest first)
  const recentTransactions = displayDocuments.length > 0 
    ? [...displayDocuments].reverse() // Show newest first
    : [];

  const handleDelete = async (transactionId) => {
    try {
      // Remove from local display first
      setDisplayDocuments(prev => prev.filter(doc => doc.id !== transactionId));
      
      // Call parent to remove from session
      onDocumentDeleted(transactionId);
      
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'processing':
        return { 
          icon: (
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), 
          text: 'Processing' 
        };
      case 'completed':
        return { 
          icon: (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), 
          text: 'Completed' 
        };
      case 'failed':
        return { 
          icon: (
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), 
          text: 'Failed' 
        };
      default:
        return { 
          icon: (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), 
          text: 'Unknown' 
        };
    }
  };

  const getCategoryBadgeClass = (category) => {
    if (!category) return 'bg-gray-500/20 text-gray-300';
    
    switch (category) {
      case 'bank-transactions': return 'bg-blue-500/20 text-blue-300';
      case 'invoices': return 'bg-green-500/20 text-green-300';
      case 'bills': return 'bg-yellow-500/20 text-yellow-300';
      case 'inventory': return 'bg-purple-500/20 text-purple-300';
      case 'item-restocks': return 'bg-orange-500/20 text-orange-300';
      case 'manual-journals': return 'bg-indigo-500/20 text-indigo-300';
      case 'general-ledgers': return 'bg-pink-500/20 text-pink-300';
      case 'general-entries': return 'bg-teal-500/20 text-teal-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getFileIcon = (fileName) => {
    // Handle cases where fileName is undefined or null
    if (!fileName) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
      return (
        <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    } else if (['docx', 'doc'].includes(extension)) {
      return (
        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
      return (
        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Uploaded Documents</h3>
      </div>
      
      {recentTransactions?.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 mb-2">
            No documents uploaded yet
          </p>
          <p className="text-gray-500 text-sm">
            Upload documents using the form above to get started
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="table-th text-xs">Document</th>
                <th className="table-th text-xs">Status</th>
                <th className="table-th text-xs">Category</th>
                <th className="table-th text-xs">Amount</th>
                <th className="table-th text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((transaction) => {
                const statusInfo = getStatusInfo(transaction.status || 'completed');
                return (
                  <tr key={transaction.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(transaction.name)}
                        <div>
                          <span className="font-medium text-white text-sm">{transaction.name || 'Unnamed Document'}</span>
                          {transaction.dashboardCategory && (
                            <div className="text-xs text-gray-400">{transaction.dashboardCategory}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center space-x-1">
                        {statusInfo.icon}
                        <span className="capitalize text-xs font-medium">{statusInfo.text}</span>
                      </div>
                    </td>
                    <td className="table-td">
                      {transaction.category && (
                        <span className={`badge text-xs ${getCategoryBadgeClass(transaction.category)}`}>
                          {transaction.category.replace('-', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="table-td font-semibold text-sm">
                      {typeof transaction.amount === 'number' ? `$${transaction.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="table-td">
                      <button
                        className="px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
                        onClick={() => handleDelete(transaction.id)}
                        title="Delete Document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DocumentTable;