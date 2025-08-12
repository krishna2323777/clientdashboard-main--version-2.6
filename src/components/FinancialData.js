import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import './FinancialData.css';

const FinancialData = () => {
  const [financialData, setFinancialData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchFinancialData();
  }, [selectedPeriod, filterType]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch financial data from multiple tables
      const [kvkData, form6Data, form9Data, form11Data, form13Data] = await Promise.all([
        supabase.from('kvk_signed_forms').select('*').eq('status', 'completed'),
        supabase.from('form_6_submissions').select('*').eq('status', 'completed'),
        supabase.from('form_9_submissions').select('*').eq('status', 'completed'),
        supabase.from('form_11_submissions').select('*').eq('status', 'completed'),
        supabase.from('form_13_submissions').select('*').eq('status', 'completed')
      ]);

      // Combine and process data
      let allData = [];
      
      if (kvkData.data) {
        allData.push(...kvkData.data.map(item => ({
          ...item,
          source: 'KVK Registration',
          type: 'registration'
        })));
      }
      
      if (form6Data.data) {
        allData.push(...form6Data.data.map(item => ({
          ...item,
          source: 'Form 6',
          type: 'tax'
        })));
      }
      
      if (form9Data.data) {
        allData.push(...form9Data.data.map(item => ({
          ...item,
          source: 'Form 9',
          type: 'tax'
        })));
      }
      
      if (form11Data.data) {
        allData.push(...form11Data.data.map(item => ({
          ...item,
          source: 'Form 11',
          type: 'tax'
        })));
      }
      
      if (form13Data.data) {
        allData.push(...form13Data.data.map(item => ({
          ...item,
          source: 'Form 13',
          type: 'tax'
        })));
      }

      // Filter by period
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      if (selectedPeriod === 'current') {
        allData = allData.filter(item => {
          const itemDate = new Date(item.upload_date || item.created_at);
          return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
        });
      } else if (selectedPeriod === 'last3months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        allData = allData.filter(item => {
          const itemDate = new Date(item.upload_date || item.created_at);
          return itemDate >= threeMonthsAgo;
        });
      } else if (selectedPeriod === 'last6months') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        allData = allData.filter(item => {
          const itemDate = new Date(item.upload_date || item.created_at);
          return itemDate >= sixMonthsAgo;
        });
      } else if (selectedPeriod === 'lastyear') {
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        allData = allData.filter(item => {
          const itemDate = new Date(item.upload_date || item.created_at);
          return itemDate >= lastYear;
        });
      }

      // Filter by type
      if (filterType !== 'all') {
        allData = allData.filter(item => item.type === filterType);
      }

      setFinancialData(allData);
    } catch (err) {
      console.error('Error fetching financial data:', err);
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totals = {
      totalRevenue: 0,
      totalExpenses: 0,
      totalProfit: 0,
      totalTax: 0,
      documentCount: financialData.length
    };

    financialData.forEach(item => {
      if (item.revenue) totals.totalRevenue += parseFloat(item.revenue) || 0;
      if (item.expenses) totals.totalExpenses += parseFloat(item.expenses) || 0;
      if (item.profit) totals.totalProfit += parseFloat(item.profit) || 0;
      if (item.tax_amount) totals.totalTax += parseFloat(item.tax_amount) || 0;
    });

    return totals;
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="financial-data-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="financial-data-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchFinancialData} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="financial-data-container">
      <div className="financial-header">
        <h1>Financial Data Dashboard</h1>
        <p>Comprehensive overview of your financial documents and submissions</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Time Period:</label>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="filter-select"
          >
            <option value="current">Current Month</option>
            <option value="last3months">Last 3 Months</option>
            <option value="last6months">Last 6 Months</option>
            <option value="lastyear">Last Year</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Document Type:</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="registration">Registration</option>
            <option value="tax">Tax Documents</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Documents</h3>
          <div className="card-value">{totals.documentCount}</div>
          <p>Processed documents</p>
        </div>
        
        <div className="summary-card">
          <h3>Total Revenue</h3>
          <div className="card-value">€{totals.totalRevenue.toLocaleString()}</div>
          <p>Combined revenue</p>
        </div>
        
        <div className="summary-card">
          <h3>Total Expenses</h3>
          <div className="card-value">€{totals.totalExpenses.toLocaleString()}</div>
          <p>Combined expenses</p>
        </div>
        
        <div className="summary-card">
          <h3>Total Tax</h3>
          <div className="card-value">€{totals.totalTax.toLocaleString()}</div>
          <p>Tax obligations</p>
        </div>
      </div>

      {/* Financial Data Table */}
      <div className="data-table-section">
        <h2>Financial Documents</h2>
        <div className="table-container">
          <table className="financial-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Source</th>
                <th>Company</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Profit</th>
                <th>Tax Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {financialData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="no-data">
                    No financial data found for the selected period and filters
                  </td>
                </tr>
              ) : (
                financialData.map((item, index) => (
                  <tr key={`${item.source}-${index}`}>
                    <td>
                      <div className="document-info">
                        <span className="document-name">
                          {item.document_name || item.form_type || 'N/A'}
                        </span>
                        <span className="document-type">{item.source}</span>
                      </div>
                    </td>
                    <td>{item.source}</td>
                    <td>{item.company_name || item.business_name || 'N/A'}</td>
                    <td className="amount">€{parseFloat(item.revenue || 0).toLocaleString()}</td>
                    <td className="amount">€{parseFloat(item.expenses || 0).toLocaleString()}</td>
                    <td className="amount">€{parseFloat(item.profit || 0).toLocaleString()}</td>
                    <td className="amount">€{parseFloat(item.tax_amount || 0).toLocaleString()}</td>
                    <td>
                      {item.upload_date || item.created_at ? 
                        new Date(item.upload_date || item.created_at).toLocaleDateString() : 
                        'N/A'
                      }
                    </td>
                    <td>
                      <span className={`status-badge ${item.status || 'pending'}`}>
                        {item.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Section */}
      <div className="export-section">
        <h3>Export Data</h3>
        <div className="export-buttons">
          <button className="export-btn csv">Export as CSV</button>
          <button className="export-btn pdf">Export as PDF</button>
          <button className="export-btn excel">Export as Excel</button>
        </div>
      </div>
    </div>
  );
};

export default FinancialData;
