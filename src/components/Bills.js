import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Bills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBill, setNewBill] = useState({
    vendorName: '',
    amount: '',
    description: '',
    dueDate: '',
    category: 'utilities'
  });

  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/`);
      const billTransactions = response.data.filter(t => t.category === 'bills');
      setBills(billTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to fetch bills');
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'paid' && bill.status === 'paid') ||
                         (filter === 'pending' && bill.status === 'pending') ||
                         (filter === 'overdue' && bill.status === 'overdue');
    
    const matchesSearch = bill.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      const billData = {
        vendorName: newBill.vendorName,
        amount: parseFloat(newBill.amount),
        description: newBill.description,
        dueDate: newBill.dueDate,
        category: newBill.category,
        type: 'debit',
        status: 'pending'
      };

      await axios.post(`${API_BASE_URL}/transactions/`, billData);
      toast.success('Bill created successfully');
      setShowCreateForm(false);
      setNewBill({ vendorName: '', amount: '', description: '', dueDate: '', category: 'utilities' });
      fetchBills();
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('Failed to create bill');
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

  const getCategoryBadge = (category) => {
    const categoryConfig = {
      utilities: { color: 'bg-blue', text: 'Utilities' },
      rent: { color: 'bg-purple', text: 'Rent' },
      supplies: { color: 'bg-green', text: 'Supplies' },
      services: { color: 'bg-orange', text: 'Services' },
      other: { color: 'bg-gray-500', text: 'Other' }
    };

    const config = categoryConfig[category] || categoryConfig.other;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} text-white`}>
        {config.text}
      </span>
    );
  };

  const chartData = [
    {
      month: '2025-08',
      paid: bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.amount || 0), 0),
      pending: bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + (b.amount || 0), 0),
      overdue: bills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + (b.amount || 0), 0)
    }
  ];

  const pieData = [
    { name: 'Utilities', value: bills.filter(b => b.category === 'utilities').length, color: '#3b82f6' },
    { name: 'Rent', value: bills.filter(b => b.category === 'rent').length, color: '#8b5cf6' },
    { name: 'Supplies', value: bills.filter(b => b.category === 'supplies').length, color: '#10b981' },
    { name: 'Services', value: bills.filter(b => b.category === 'services').length, color: '#f59e0b' },
    { name: 'Other', value: bills.filter(b => !['utilities', 'rent', 'supplies', 'services'].includes(b.category)).length, color: '#6b7280' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading bills...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Bills</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Bill'}
        </button>
      </div>

      {/* Create Bill Form */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Bill</h3>
          <form onSubmit={handleCreateBill} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Vendor Name</label>
                <input
                  type="text"
                  value={newBill.vendorName}
                  onChange={(e) => setNewBill({...newBill, vendorName: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBill.amount}
                  onChange={(e) => setNewBill({...newBill, amount: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Category</label>
                <select
                  value={newBill.category}
                  onChange={(e) => setNewBill({...newBill, category: e.target.value})}
                  className="input w-full"
                  required
                >
                  <option value="utilities">Utilities</option>
                  <option value="rent">Rent</option>
                  <option value="supplies">Supplies</option>
                  <option value="services">Services</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Due Date</label>
                <input
                  type="date"
                  value={newBill.dueDate}
                  onChange={(e) => setNewBill({...newBill, dueDate: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={newBill.description}
                onChange={(e) => setNewBill({...newBill, description: e.target.value})}
                className="input w-full"
                required
              />
            </div>
            <button type="submit" className="btn btn-success">
              Create Bill
            </button>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Bills</h3>
          <p className="text-2xl font-bold text-white">{bills.length}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Amount</h3>
          <p className="text-2xl font-bold text-red">
            ${bills.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Paid</h3>
          <p className="text-2xl font-bold text-green">
            ${bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Outstanding</h3>
          <p className="text-2xl font-bold text-red">
            ${bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
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
            placeholder="Search bills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full md:w-64"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Bill Status Overview</h3>
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
                <Bar dataKey="paid" fill="#10b981" name="Paid" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Category Distribution</h3>
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

      {/* Bills Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Bill Details</h3>
        
        {filteredBills.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No bills found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{bill.name}</p>
                          <p className="text-gray-400 text-sm">Bill</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-white">{bill.vendorName || 'N/A'}</span>
                    </td>
                    <td>
                      {getCategoryBadge(bill.category || 'other')}
                    </td>
                    <td>
                      <span className="font-semibold text-red">
                        ${bill.amount?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(bill.status || 'pending')}
                    </td>
                    <td>
                      <span className="text-gray-300">
                        {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="text-gray-300 text-sm">
                        {bill.description || 'No description'}
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

export default Bills;
