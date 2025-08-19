import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ManualJournals = () => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newJournal, setNewJournal] = useState({
    reference: '',
    description: '',
    debitAccount: '',
    creditAccount: '',
    amount: '',
    date: ''
  });

  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/`);
      const journalTransactions = response.data.filter(t => t.category === 'manual-journals');
      setJournals(journalTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching journals:', error);
      toast.error('Failed to fetch journals');
      setLoading(false);
    }
  };

  const filteredJournals = journals.filter(journal => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'posted' && journal.status === 'posted') ||
                         (filter === 'draft' && journal.status === 'draft') ||
                         (filter === 'void' && journal.status === 'void');
    
    const matchesSearch = journal.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         journal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         journal.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleCreateJournal = async (e) => {
    e.preventDefault();
    try {
      const journalData = {
        reference: newJournal.reference,
        description: newJournal.description,
        debitAccount: newJournal.debitAccount,
        creditAccount: newJournal.creditAccount,
        amount: parseFloat(newJournal.amount),
        date: newJournal.date,
        category: 'manual-journals',
        type: 'debit',
        status: 'draft'
      };

      await axios.post(`${API_BASE_URL}/transactions/`, journalData);
      toast.success('Journal entry created successfully');
      setShowCreateForm(false);
      setNewJournal({ reference: '', description: '', debitAccount: '', creditAccount: '', amount: '', date: '' });
      fetchJournals();
    } catch (error) {
      console.error('Error creating journal entry:', error);
      toast.error('Failed to create journal entry');
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
      posted: journals.filter(j => j.status === 'posted').reduce((sum, j) => sum + (j.amount || 0), 0),
      draft: journals.filter(j => j.status === 'draft').reduce((sum, j) => sum + (j.amount || 0), 0),
      void: journals.filter(j => j.status === 'void').reduce((sum, j) => sum + (j.amount || 0), 0)
    }
  ];

  const monthlyData = [
    {
      month: '2025-08',
      totalEntries: journals.length,
      totalAmount: journals.reduce((sum, j) => sum + (j.amount || 0), 0)
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading journals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Manual Journals</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Journal Entry'}
        </button>
      </div>

      {/* Create Journal Form */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Journal Entry</h3>
          <form onSubmit={handleCreateJournal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Reference</label>
                <input
                  type="text"
                  value={newJournal.reference}
                  onChange={(e) => setNewJournal({...newJournal, reference: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={newJournal.date}
                  onChange={(e) => setNewJournal({...newJournal, date: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={newJournal.description}
                onChange={(e) => setNewJournal({...newJournal, description: e.target.value})}
                className="input w-full"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Debit Account</label>
                <input
                  type="text"
                  value={newJournal.debitAccount}
                  onChange={(e) => setNewJournal({...newJournal, debitAccount: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Credit Account</label>
                <input
                  type="text"
                  value={newJournal.creditAccount}
                  onChange={(e) => setNewJournal({...newJournal, creditAccount: e.target.value})}
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
                value={newJournal.amount}
                onChange={(e) => setNewJournal({...newJournal, amount: e.target.value})}
                className="input w-full"
                required
              />
            </div>
            <button type="submit" className="btn btn-success">
              Create Journal Entry
            </button>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Entries</h3>
          <p className="text-2xl font-bold text-white">{journals.length}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Amount</h3>
          <p className="text-2xl font-bold text-blue">
            ${journals.reduce((sum, j) => sum + (j.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Posted</h3>
          <p className="text-2xl font-bold text-green">
            {journals.filter(j => j.status === 'posted').length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Draft</h3>
          <p className="text-2xl font-bold text-yellow-500">
            {journals.filter(j => j.status === 'draft').length}
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
            placeholder="Search journals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full md:w-64"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Journal Status Overview</h3>
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
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Journal Trends</h3>
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

      {/* Journals Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Journal Details</h3>
        
        {filteredJournals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No journal entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Journal Entry</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Debit Account</th>
                  <th>Credit Account</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredJournals.map((journal) => (
                  <tr key={journal.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{journal.name}</p>
                          <p className="text-gray-400 text-sm">Journal Entry</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-white font-medium">{journal.reference || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="text-gray-300">
                        {journal.date ? new Date(journal.date).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="text-red font-medium">{journal.debitAccount || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="text-green font-medium">{journal.creditAccount || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-blue">
                        ${(journal.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(journal.status || 'draft')}
                    </td>
                    <td>
                      <span className="text-gray-300 text-sm">
                        {journal.description || 'No description'}
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

export default ManualJournals;
