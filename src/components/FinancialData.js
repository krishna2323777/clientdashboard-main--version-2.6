import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import DocumentUpload from './DocumentUpload';
import DocumentTable from './DocumentTable';
import RecentActivity from './RecentActivity';
import './FinancialData.css';

const FinancialData = () => {
  const [dashboardData, setDashboardData] = useState({
    cashBalance: 0,
    revenue: 0,
    expenses: 0,
    netBurn: 0
  });
  const [transactions, setTransactions] = useState([]); // Only current session documents

  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  useEffect(() => {
    fetchDashboardData();
    // Don't fetch transactions on mount - start with empty list
    // fetchTransactions();
  }, []);

  // Debug: Monitor transactions state changes
  useEffect(() => {
    // Removed debug logging for cleaner code
  }, [transactions]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard-summary/`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    }
  };

  const handleDocumentUploaded = (newDocument) => {
    // Add the new document to the current session instead of fetching from backend
    if (newDocument) {
      setTransactions(prev => [...prev, newDocument]);
    }
  };

  const handleDocumentDeleted = (transactionId) => {
    // Remove document from current session
    setTransactions(prev => prev.filter(doc => doc.id !== transactionId));
  };

  const handleResetData = async () => {
    try {
      await axios.post(`${API_BASE_URL}/reset-data/`);
      setTransactions([]); // Clear current session transactions
      setDashboardData({
        cashBalance: 0,
        revenue: 0,
        expenses: 0,
        netBurn: 0
      });
      toast.success('Data reset successfully');
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Failed to reset data');
    }
  };

  // Prepare chart data
  const cashFlowData = [
    {
      month: '2025-08',
      inflow: dashboardData.revenue,
      outflow: dashboardData.expenses,
      net: dashboardData.revenue - dashboardData.expenses
    }
  ];

  const monthlyComparisonData = [
    {
      month: '2025-08',
      inflow: dashboardData.revenue,
      outflow: dashboardData.expenses
    }
  ];

  return (
    <div className="financial-data-container">
      {/* Header with Reset Data button */}
      <div className="financial-data-header">
        <h1 className="financial-data-title">Dashboard</h1>
        <button
          onClick={handleResetData}
          className="reset-data-btn"
        >
          Reset Data
        </button>
      </div>

      {/* Financial Metrics - Single Line Layout */}
      <div className="metrics-grid">
        <div className="metric-card cash-balance">
          <div className="metric-content">
            <div className="metric-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="metric-info">
              <h3>Cash Balance</h3>
              <p className="metric-value">${dashboardData.cashBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="metric-card revenue">
          <div className="metric-content">
            <div className="metric-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="metric-info">
              <h3>Revenue</h3>
              <p className="metric-value">${dashboardData.revenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="metric-card expenses">
          <div className="metric-content">
            <div className="metric-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div className="metric-info">
              <h3>Expenses</h3>
              <p className="metric-value">${dashboardData.expenses.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="metric-card net-burn">
          <div className="metric-content">
            <div className="metric-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <div className="metric-info">
              <h3>Net Burn</h3>
              <p className="metric-value">${dashboardData.netBurn.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="last-updated">
        <p>
          Last updated: {new Date().toLocaleDateString('en-GB')}
        </p>
      </div>

      {/* Charts Section - Above AI Card, Always Side by Side */}
      <div className="charts-section">
        {/* Cash Flow Chart */}
        <div className="chart-card">
          <h3 className="chart-title">Cash Flow Trend</h3>
          <div className="chart-container">
            <LineChart width={600} height={300} data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#3c335b',
                  border: '1px solid #4a416a',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{color: '#e2e8f0', fontSize: '10px'}}/>
              <Line type="monotone" dataKey="inflow" stroke="#4ade80" strokeWidth={2} name="Inflow" />
              <Line type="monotone" dataKey="outflow" stroke="#f87171" strokeWidth={2} name="Outflow" />
              <Line type="monotone" dataKey="net" stroke="#60a5fa" strokeWidth={2} name="Net" />
            </LineChart>
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="chart-card">
          <h3 className="chart-title">Monthly Comparison</h3>
          <div className="chart-container">
            <BarChart width={620} height={300} data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Legend wrapperStyle={{color: '#e2e8f0', fontSize: '10px'}}/>
              <Bar dataKey="inflow" fill="#4ade80" name="Inflow" radius={[2, 2, 0, 0]} />
              <Bar dataKey="outflow" fill="#f87171" name="Outflow" radius={[2, 2, 0, 0]} />
            </BarChart>
          </div>
        </div>
      </div>

      {/* Main Content - Documents AI on left, Charts on right */}
      <div className="main-content">
        {/* Documents AI Section - Takes 2/3 of the space */}
        <div className="documents-section">
          {/* Documents AI Header */}
          <div className="ai-header">
            <div className="ai-header-content">
              <svg className="ai-header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="ai-header-text">AI-Powered Document Analysis</span>
            </div>
          </div>

          {/* AI Accounting Assistant Card */}
          <div className="ai-card">
            <div className="ai-card-header">
              <div className="ai-card-icon">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>
                  <circle cx="9" cy="9" r="1" fill="purple"/>
                  <circle cx="15" cy="9" r="1" fill="purple"/>
                  <rect x="8" y="12" width="8" height="2" rx="1" fill="purple"/>
                  <rect x="10" y="4" width="2" height="3" rx="1" fill="white"/>
                  <rect x="12" y="4" width="2" height="3" rx="1" fill="white"/>
                </svg>
              </div>
              <h3 className="ai-card-title">AI Accounting Assistant</h3>
            </div>
            <p className="ai-card-description">
              Let our AI help you categorize transactions, reconcile accounts, and generate insights from your financial data.
            </p>
            <button className="ai-start-btn">
              Start AI Analysis
            </button>
          </div>

          {/* Upload Area - Two Panels Side by Side */}
          <div className="upload-panels">
            {/* Choose Files Panel */}
            <div className="upload-panel">
              <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
            </div>

            {/* Import from Base Company Panel */}
            <div className="upload-panel">
              <div className="import-panel">
                <svg className="import-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="import-text">
                  Load documents from your base company system
                </p>
                <button className="import-btn">
                  <svg className="import-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Import Documents</span>
                </button>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <DocumentTable 
            transactions={transactions} 
            onDocumentDeleted={handleDocumentDeleted}
          />
        </div>

        {/* Right Sidebar - Recent Activity Only */}
        <div className="sidebar-section">
          {/* Recent Activity */}
          <div className="activity-card">
            <h3 className="activity-title">Recent Activity</h3>
            <div className="activity-list">
              {transactions && transactions.length > 0 ? (
                transactions.slice(0, 3).map((transaction) => (
                  <div key={transaction.id} className="activity-item">
                    <div className="activity-info">
                      <div className="activity-indicator" />
                      <div>
                        <p className="activity-name">{transaction.name || 'Document'}</p>
                        <p className="activity-date">{new Date(transaction.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="activity-amount"> 
                      ${transaction.amount?.toLocaleString() || '0'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-activity">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialData;
