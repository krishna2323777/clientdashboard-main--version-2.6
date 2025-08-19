import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ItemRestocks = () => {
  const [restocks, setRestocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRestock, setNewRestock] = useState({
    itemName: '',
    quantity: '',
    unitCost: '',
    supplier: '',
    description: ''
  });

  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  useEffect(() => {
    fetchRestocks();
  }, []);

  const fetchRestocks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/`);
      const restockTransactions = response.data.filter(t => t.category === 'item-restocks');
      setRestocks(restockTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching restocks:', error);
      toast.error('Failed to fetch restocks');
      setLoading(false);
    }
  };

  const filteredRestocks = restocks.filter(restock => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'completed' && restock.status === 'completed') ||
                         (filter === 'pending' && restock.status === 'pending') ||
                         (filter === 'cancelled' && restock.status === 'cancelled');
    
    const matchesSearch = restock.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         restock.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         restock.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleCreateRestock = async (e) => {
    e.preventDefault();
    try {
      const restockData = {
        itemName: newRestock.itemName,
        quantity: parseInt(newRestock.quantity),
        unitCost: parseFloat(newRestock.unitCost),
        supplier: newRestock.supplier,
        description: newRestock.description,
        category: 'item-restocks',
        type: 'debit',
        status: 'pending',
        amount: parseFloat(newRestock.quantity) * parseFloat(newRestock.unitCost)
      };

      await axios.post(`${API_BASE_URL}/transactions/`, restockData);
      toast.success('Restock order created successfully');
      setShowCreateForm(false);
      setNewRestock({ itemName: '', quantity: '', unitCost: '', supplier: '', description: '' });
      fetchRestocks();
    } catch (error) {
      console.error('Error creating restock order:', error);
      toast.error('Failed to create restock order');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green', text: 'Completed' },
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      cancelled: { color: 'bg-red', text: 'Cancelled' }
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
      completed: restocks.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.amount || 0), 0),
      pending: restocks.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.amount || 0), 0),
      cancelled: restocks.filter(r => r.status === 'cancelled').reduce((sum, r) => sum + (r.amount || 0), 0)
    }
  ];

  const monthlyData = [
    {
      month: '2025-08',
      totalRestocks: restocks.length,
      totalCost: restocks.reduce((sum, r) => sum + (r.amount || 0), 0)
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading restocks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Item Restocks</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Restock Order'}
        </button>
      </div>

      {/* Create Restock Form */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Restock Order</h3>
          <form onSubmit={handleCreateRestock} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Item Name</label>
                <input
                  type="text"
                  value={newRestock.itemName}
                  onChange={(e) => setNewRestock({...newRestock, itemName: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newRestock.quantity}
                  onChange={(e) => setNewRestock({...newRestock, quantity: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Unit Cost</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newRestock.unitCost}
                  onChange={(e) => setNewRestock({...newRestock, unitCost: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Supplier</label>
                <input
                  type="text"
                  value={newRestock.supplier}
                  onChange={(e) => setNewRestock({...newRestock, supplier: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={newRestock.description}
                onChange={(e) => setNewRestock({...newRestock, description: e.target.value})}
                className="input w-full"
                required
              />
            </div>
            <button type="submit" className="btn btn-success">
              Create Restock Order
            </button>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Restocks</h3>
          <p className="text-2xl font-bold text-white">{restocks.length}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Cost</h3>
          <p className="text-2xl font-bold text-red">
            ${restocks.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Completed</h3>
          <p className="text-2xl font-bold text-green">
            {restocks.filter(r => r.status === 'completed').length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Pending</h3>
          <p className="text-2xl font-bold text-yellow-500">
            {restocks.filter(r => r.status === 'pending').length}
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
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'completed' ? 'bg-green text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Completed
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
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'cancelled' ? 'bg-red text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Cancelled
            </button>
          </div>
          <input
            type="text"
            placeholder="Search restocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full md:w-64"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Restock Status Overview</h3>
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
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Restock Trends</h3>
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
                <Line type="monotone" dataKey="totalRestocks" stroke="#8b5cf6" strokeWidth={2} name="Total Restocks" />
                <Line type="monotone" dataKey="totalCost" stroke="#10b981" strokeWidth={2} name="Total Cost" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Restocks Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Restock Details</h3>
        
        {filteredRestocks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No restock orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Restock Order</th>
                  <th>Item</th>
                  <th>Supplier</th>
                  <th>Quantity</th>
                  <th>Unit Cost</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestocks.map((restock) => {
                  const totalCost = (restock.quantity || 0) * (restock.unitCost || 0);
                  
                  return (
                    <tr key={restock.id}>
                      <td>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-white font-medium">{restock.name}</p>
                            <p className="text-gray-400 text-sm">Restock Order</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-white">{restock.itemName || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="text-gray-300">{restock.supplier || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="font-semibold text-white">
                          {restock.quantity || 0}
                        </span>
                      </td>
                      <td>
                        <span className="text-gray-300">
                          ${(restock.unitCost || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-red">
                          ${totalCost.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        {getStatusBadge(restock.status || 'pending')}
                      </td>
                      <td>
                        <span className="text-gray-300 text-sm">
                          {restock.description || 'No description'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemRestocks;
