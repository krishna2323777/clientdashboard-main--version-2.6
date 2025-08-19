import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';

const DocumentUpload = ({ onDocumentUploaded }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  async function uploadFileToS3Presigned(file, s3Key, bucketName) {
    // 1. Get pre-signed URL from backend
    const res = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ s3_key: s3Key, bucket_name: bucketName }),
    });
    if (!res.ok) throw new Error('Presigned URL generation failed');
    const { url } = await res.json();

    // 2. Upload file to S3 using the pre-signed URL
    const uploadRes = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error('S3 upload failed');
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    setIsAnalyzing(true);
    let successCount = 0;
    let errorCount = 0;
    const uploadedDocuments = [];

    for (const file of acceptedFiles) {
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

      try {
        const s3Key = `documents/${Date.now()}-${file.name}`;
        const bucketName = 'financedashboard-frontend-prod';

        await uploadFileToS3Presigned(file, s3Key, bucketName);
        
        // Only call backend if upload succeeded
        const response = await axios.post(`${API_BASE_URL}/analyze-s3-document`, {
          s3_key: s3Key,
          bucket_name: bucketName
        });

        if (response.data && response.data.status === 'completed') {
          // Create a document object for the current session
          const documentData = {
            id: fileId,
            name: file.name,
            status: 'completed',
            category: response.data.category || 'unknown',
            amount: response.data.amount || 0,
            dashboardCategory: response.data.dashboardCategory || 'Document',
            uploadedAt: new Date().toISOString()
          };
          
          uploadedDocuments.push(documentData);
          toast.success(`Successfully processed ${file.name}`);
          successCount++;
        } else {
          toast.error(`Failed to process ${file.name}`);
          errorCount++;
        }

      } catch (error) {
        toast.error(`Failed to process ${file.name}`);
        errorCount++;
      }
    }

    setIsAnalyzing(false);
    
    // Show summary and pass uploaded documents to parent
    if (successCount > 0) {
      toast.success(`Successfully processed ${successCount} document(s)!`);
      
      // Pass all uploaded documents to parent component
      uploadedDocuments.forEach(doc => {
        onDocumentUploaded(doc);
      });
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} document(s) failed to process`);
    }
  }, [onDocumentUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Document Analysis</h3>
        <p className="text-gray-400 text-sm">
          Let our AI help you categorize transactions, reconcile accounts, and generate insights from your financial data.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isDragActive
            ? 'border-purple-400 bg-purple-500/10 shadow-lg'
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'
        }`}
      >
        <input {...getInputProps()} />
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-base font-medium text-white mb-2">
          {isDragActive ? 'Drop your documents here' : 'Upload financial documents'}
        </p>
        <p className="text-sm text-gray-400">
          Drag & drop files or click to browse. Supports PDF, DOCX, TXT, CSV, Excel files.
        </p>
        {isAnalyzing && (
          <div className="mt-3 flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-400 border-t-transparent"></div>
            <span className="text-purple-400 text-sm font-medium">Analyzing documents...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
