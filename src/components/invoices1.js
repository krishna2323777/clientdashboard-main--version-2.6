import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Invoices1 = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerName: '',
    amount: '',
    description: '',
    dueDate: ''
  });

  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/`);
      const invoiceTransactions = response.data.filter(t => t.category === 'invoices');
      setInvoices(invoiceTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'paid' && invoice.status === 'paid') ||
                         (filter === 'pending' && invoice.status === 'pending') ||
                         (filter === 'overdue' && invoice.status === 'overdue');
    
    const matchesSearch = invoice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const invoiceData = {
        customerName: newInvoice.customerName,
        amount: parseFloat(newInvoice.amount),
        description: newInvoice.description,
        dueDate: newInvoice.dueDate,
        category: 'invoices',
        type: 'credit',
        status: 'pending'
      };

      await axios.post(`${API_BASE_URL}/transactions/`, invoiceData);
      toast.success('Invoice created successfully');
      setShowCreateForm(false);
      setNewInvoice({ customerName: '', amount: '', description: '', dueDate: '' });
      fetchInvoices();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: { color: 'bg-green', text: 'Paid' },
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      overdue: { color: 'bg-red', text: 'Overdue' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} text-white`}>
        {config.text}
      </span>
    );
  };

  const chartData = [
    {
      month: '2025-08',
      paid: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0),
      pending: invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.amount || 0), 0),
      overdue: invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + (i.amount || 0), 0)
    }
  ];

  const pieData = [
    { name: 'Paid', value: invoices.filter(i => i.status === 'paid').length, color: '#10b981' },
    { name: 'Pending', value: invoices.filter(i => i.status === 'pending').length, color: '#f59e0b' },
    { name: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, color: '#ef4444' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading invoices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Invoices</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Invoice'}
        </button>
      </div>

      {/* Create Invoice Form */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Invoice</h3>
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Customer Name</label>
                <input
                  type="text"
                  value={newInvoice.customerName}
                  onChange={(e) => setNewInvoice({...newInvoice, customerName: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({...newInvoice, amount: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={newInvoice.description}
                onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Due Date</label>
              <input
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                className="input w-full"
                required
              />
            </div>
            <button type="submit" className="btn btn-success">
              Create Invoice
            </button>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Invoices</h3>
          <p className="text-2xl font-bold text-white">{invoices.length}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Amount</h3>
          <p className="text-2xl font-bold text-green">
            ${invoices.reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Paid</h3>
          <p className="text-2xl font-bold text-green">
            ${invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Outstanding</h3>
          <p className="text-2xl font-bold text-red">
            ${invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString()}
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
              onClick={() => setFilter('paid')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'paid' ? 'bg-green text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'overdue' ? 'bg-red text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Overdue
            </button>
          </div>
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full md:w-64"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Invoice Status Overview</h3>
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
                <Line type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="overdue" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Status Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: '1px solid #2d2d44',
                    color: '#ffffff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Invoice Details</h3>
        
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{invoice.name}</p>
                          <p className="text-gray-400 text-sm">Invoice</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-white">{invoice.customerName || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-green">
                        ${invoice.amount?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(invoice.status || 'pending')}
                    </td>
                    <td>
                      <span className="text-gray-300">
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="text-gray-300 text-sm">
                        {invoice.description || 'No description'}
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

export default Invoices1;
