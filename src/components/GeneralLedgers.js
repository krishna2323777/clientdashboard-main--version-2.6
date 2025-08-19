import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const GeneralLedgers = () => {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLedger, setNewLedger] = useState({
    accountName: '',
    accountType: 'asset',
    openingBalance: '',
    description: ''
  });

  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  useEffect(() => {
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/`);
      const ledgerTransactions = response.data.filter(t => t.category === 'general-ledgers');
      setLedgers(ledgerTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      toast.error('Failed to fetch ledgers');
      setLoading(false);
    }
  };

  const filteredLedgers = ledgers.filter(ledger => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'asset' && ledger.accountType === 'asset') ||
                         (filter === 'liability' && ledger.accountType === 'liability') ||
                         (filter === 'equity' && ledger.accountType === 'equity') ||
                         (filter === 'revenue' && ledger.accountType === 'revenue') ||
                         (filter === 'expense' && ledger.accountType === 'expense');
    
    const matchesSearch = ledger.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ledger.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ledger.accountName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleCreateLedger = async (e) => {
    e.preventDefault();
    try {
      const ledgerData = {
        accountName: newLedger.accountName,
        accountType: newLedger.accountType,
        openingBalance: parseFloat(newLedger.openingBalance),
        description: newLedger.description,
        category: 'general-ledgers',
        type: 'debit',
        status: 'active'
      };

      await axios.post(`${API_BASE_URL}/transactions/`, ledgerData);
      toast.success('Ledger account created successfully');
      setShowCreateForm(false);
      setNewLedger({ accountName: '', accountType: 'asset', openingBalance: '', description: '' });
      fetchLedgers();
    } catch (error) {
      console.error('Error creating ledger account:', error);
      toast.error('Failed to create ledger account');
    }
  };

  const getAccountTypeBadge = (accountType) => {
    const typeConfig = {
      asset: { color: 'bg-green', text: 'Asset' },
      liability: { color: 'bg-red', text: 'Liability' },
      equity: { color: 'bg-blue', text: 'Equity' },
      revenue: { color: 'bg-purple', text: 'Revenue' },
      expense: { color: 'bg-orange', text: 'Expense' }
    };

    const config = typeConfig[accountType] || typeConfig.asset;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} text-white`}>
        {config.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green', text: 'Active' },
      inactive: { color: 'bg-gray-500', text: 'Inactive' },
      suspended: { color: 'bg-red', text: 'Suspended' }
    };

    const config = statusConfig[status] || statusConfig.active;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} text-white`}>
        {config.text}
      </span>
    );
  };

  const chartData = [
    {
      month: '2025-08',
      assets: ledgers.filter(l => l.accountType === 'asset').reduce((sum, l) => sum + (l.openingBalance || 0), 0),
      liabilities: ledgers.filter(l => l.accountType === 'liability').reduce((sum, l) => sum + (l.openingBalance || 0), 0),
      equity: ledgers.filter(l => l.accountType === 'equity').reduce((sum, l) => sum + (l.openingBalance || 0), 0)
    }
  ];

  const accountTypeData = [
    { name: 'Assets', value: ledgers.filter(l => l.accountType === 'asset').length, color: '#10b981' },
    { name: 'Liabilities', value: ledgers.filter(l => l.accountType === 'liability').length, color: '#ef4444' },
    { name: 'Equity', value: ledgers.filter(l => l.accountType === 'equity').length, color: '#3b82f6' },
    { name: 'Revenue', value: ledgers.filter(l => l.accountType === 'revenue').length, color: '#8b5cf6' },
    { name: 'Expenses', value: ledgers.filter(l => l.accountType === 'expense').length, color: '#f59e0b' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading ledgers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">General Ledgers</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Ledger Account'}
        </button>
      </div>

      {/* Create Ledger Form */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Ledger Account</h3>
          <form onSubmit={handleCreateLedger} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Account Name</label>
                <input
                  type="text"
                  value={newLedger.accountName}
                  onChange={(e) => setNewLedger({...newLedger, accountName: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Account Type</label>
                <select
                  value={newLedger.accountType}
                  onChange={(e) => setNewLedger({...newLedger, accountType: e.target.value})}
                  className="input w-full"
                  required
                >
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Opening Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={newLedger.openingBalance}
                  onChange={(e) => setNewLedger({...newLedger, openingBalance: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={newLedger.description}
                  onChange={(e) => setNewLedger({...newLedger, description: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success">
              Create Ledger Account
            </button>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Accounts</h3>
          <p className="text-2xl font-bold text-white">{ledgers.length}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Assets</h3>
          <p className="text-2xl font-bold text-green">
            ${ledgers.filter(l => l.accountType === 'asset').reduce((sum, l) => sum + (l.openingBalance || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Liabilities</h3>
          <p className="text-2xl font-bold text-red">
            ${ledgers.filter(l => l.accountType === 'liability').reduce((sum, l) => sum + (l.openingBalance || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Equity</h3>
          <p className="text-2xl font-bold text-blue">
            ${ledgers.filter(l => l.accountType === 'equity').reduce((sum, l) => sum + (l.openingBalance || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Net Worth</h3>
          <p className="text-2xl font-bold text-purple">
            ${(ledgers.filter(l => l.accountType === 'asset').reduce((sum, l) => sum + (l.openingBalance || 0), 0) - 
               ledgers.filter(l => l.accountType === 'liability').reduce((sum, l) => sum + (l.openingBalance || 0), 0)).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-purple text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('asset')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'asset' ? 'bg-green text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Assets
            </button>
            <button
              onClick={() => setFilter('liability')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'liability' ? 'bg-red text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Liabilities
            </button>
            <button
              onClick={() => setFilter('equity')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'equity' ? 'bg-blue text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Equity
            </button>
            <button
              onClick={() => setFilter('revenue')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'revenue' ? 'bg-purple text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setFilter('expense')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'expense' ? 'bg-orange text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Expenses
            </button>
          </div>
          <input
            type="text"
            placeholder="Search ledgers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full md:w-64"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Account Type Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: '1px solid #2d2d44',
                    color: '#ffffff'
                  }}
                />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Financial Position Overview</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: '1px solid #2d2d44',
                    color: '#ffffff'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="assets" stroke="#10b981" strokeWidth={2} name="Assets" />
                <Line type="monotone" dataKey="liabilities" stroke="#ef4444" strokeWidth={2} name="Liabilities" />
                <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} name="Equity" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ledgers Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Ledger Account Details</h3>
        
        {filteredLedgers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No ledger accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Account Name</th>
                  <th>Type</th>
                  <th>Opening Balance</th>
                  <th>Current Balance</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedgers.map((ledger) => (
                  <tr key={ledger.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{ledger.name}</p>
                          <p className="text-gray-400 text-sm">Ledger Account</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-white font-medium">{ledger.accountName || 'N/A'}</span>
                    </td>
                    <td>
                      {getAccountTypeBadge(ledger.accountType || 'asset')}
                    </td>
                    <td>
                      <span className={`font-semibold ${
                        ledger.accountType === 'asset' || ledger.accountType === 'equity' ? 'text-green' : 'text-red'
                      }`}>
                        ${(ledger.openingBalance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={`font-semibold ${
                        ledger.accountType === 'asset' || ledger.accountType === 'equity' ? 'text-green' : 'text-red'
                      }`}>
                        ${(ledger.openingBalance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(ledger.status || 'active')}
                    </td>
                    <td>
                      <span className="text-gray-300 text-sm">
                        {ledger.description || 'No description'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralLedgers;
