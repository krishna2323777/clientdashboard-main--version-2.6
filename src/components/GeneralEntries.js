import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const GeneralEntries = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entryNumber: '',
    description: '',
    debitAccount: '',
    creditAccount: '',
    amount: '',
    date: ''
  });

  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/`);
      const entryTransactions = response.data.filter(t => t.category === 'general-entries');
      setEntries(entryTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to fetch entries');
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'posted' && entry.status === 'posted') ||
                         (filter === 'draft' && entry.status === 'draft') ||
                         (filter === 'void' && entry.status === 'void');
    
    const matchesSearch = entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.entryNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    try {
      const entryData = {
        entryNumber: newEntry.entryNumber,
        description: newEntry.description,
        debitAccount: newEntry.debitAccount,
        creditAccount: newEntry.creditAccount,
        amount: parseFloat(newEntry.amount),
        date: newEntry.date,
        category: 'general-entries',
        type: 'debit',
        status: 'draft'
      };

      await axios.post(`${API_BASE_URL}/transactions/`, entryData);
      toast.success('General entry created successfully');
      setShowCreateForm(false);
      setNewEntry({ entryNumber: '', description: '', debitAccount: '', creditAccount: '', amount: '', date: '' });
      fetchEntries();
    } catch (error) {
      console.error('Error creating general entry:', error);
      toast.error('Failed to create general entry');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      posted: { color: 'bg-green', text: 'Posted' },
      draft: { color: 'bg-yellow-500', text: 'Draft' },
      void: { color: 'bg-red', text: 'Void' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} text-white`}>
        {config.text}
      </span>
    );
  };

  const chartData = [
    {
      month: '2025-08',
      posted: entries.filter(e => e.status === 'posted').reduce((sum, e) => sum + (e.amount || 0), 0),
      draft: entries.filter(e => e.status === 'draft').reduce((sum, e) => sum + (e.amount || 0), 0),
      void: entries.filter(e => e.status === 'void').reduce((sum, e) => sum + (e.amount || 0), 0)
    }
  ];

  const monthlyData = [
    {
      month: '2025-08',
      totalEntries: entries.length,
      totalAmount: entries.reduce((sum, e) => sum + (e.amount || 0), 0)
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading entries...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">General Entries</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create General Entry'}
        </button>
      </div>

      {/* Create Entry Form */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Create New General Entry</h3>
          <form onSubmit={handleCreateEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Entry Number</label>
                <input
                  type="text"
                  value={newEntry.entryNumber}
                  onChange={(e) => setNewEntry({...newEntry, entryNumber: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={newEntry.description}
                onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                className="input w-full"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Debit Account</label>
                <input
                  type="text"
                  value={newEntry.debitAccount}
                  onChange={(e) => setNewEntry({...newEntry, debitAccount: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Credit Account</label>
                <input
                  type="text"
                  value={newEntry.creditAccount}
                  onChange={(e) => setNewEntry({...newEntry, creditAccount: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})}
                className="input w-full"
                required
              />
            </div>
            <button type="submit" className="btn btn-success">
              Create General Entry
            </button>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Entries</h3>
          <p className="text-2xl font-bold text-white">{entries.length}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Amount</h3>
          <p className="text-2xl font-bold text-blue">
            ${entries.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Posted</h3>
          <p className="text-2xl font-bold text-green">
            {entries.filter(e => e.status === 'posted').length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Draft</h3>
          <p className="text-2xl font-bold text-yellow-500">
            {entries.filter(e => e.status === 'draft').length}
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
              onClick={() => setFilter('posted')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'posted' ? 'bg-green text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Posted
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'draft' ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setFilter('void')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'void' ? 'bg-red text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Void
            </button>
          </div>
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full md:w-64"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Entry Status Overview</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                <Bar dataKey="posted" fill="#10b981" name="Posted" />
                <Bar dataKey="draft" fill="#f59e0b" name="Draft" />
                <Bar dataKey="void" fill="#ef4444" name="Void" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Entry Trends</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
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
                <Line type="monotone" dataKey="totalEntries" stroke="#8b5cf6" strokeWidth={2} name="Total Entries" />
                <Line type="monotone" dataKey="totalAmount" stroke="#10b981" strokeWidth={2} name="Total Amount" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">General Entry Details</h3>
        
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No general entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Entry Number</th>
                  <th>Date</th>
                  <th>Debit Account</th>
                  <th>Credit Account</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{entry.name}</p>
                          <p className="text-gray-400 text-sm">General Entry</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-white font-medium">{entry.entryNumber || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="text-gray-300">
                        {entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="text-red font-medium">{entry.debitAccount || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="text-green font-medium">{entry.creditAccount || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-blue">
                        ${(entry.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(entry.status || 'draft')}
                    </td>
                    <td>
                      <span className="text-gray-300 text-sm">
                        {entry.description || 'No description'}
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

export default GeneralEntries;
