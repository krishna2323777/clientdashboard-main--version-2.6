import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    unitPrice: '',
    category: 'general',
    description: ''
  });

  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/`);
      const inventoryTransactions = response.data.filter(t => t.category === 'inventory');
      setInventory(inventoryTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to fetch inventory');
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'low-stock' && (item.quantity || 0) < 10) ||
                         (filter === 'out-of-stock' && (item.quantity || 0) === 0) ||
                         (filter === 'in-stock' && (item.quantity || 0) >= 10);
    
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        name: newItem.name,
        quantity: parseInt(newItem.quantity),
        unitPrice: parseFloat(newItem.unitPrice),
        category: newItem.category,
        description: newItem.description,
        category: 'inventory',
        type: 'debit',
        amount: parseFloat(newItem.quantity) * parseFloat(newItem.unitPrice)
      };

      await axios.post(`${API_BASE_URL}/transactions/`, itemData);
      toast.success('Inventory item created successfully');
      setShowCreateForm(false);
      setNewItem({ name: '', quantity: '', unitPrice: '', category: 'general', description: '' });
      fetchInventory();
    } catch (error) {
      console.error('Error creating inventory item:', error);
      toast.error('Failed to create inventory item');
    }
  };

  const getCategoryBadge = (category) => {
    const categoryConfig = {
      general: { color: 'bg-gray-500', text: 'General' },
      electronics: { color: 'bg-blue', text: 'Electronics' },
      furniture: { color: 'bg-purple', text: 'Furniture' },
      supplies: { color: 'bg-green', text: 'Supplies' },
      equipment: { color: 'bg-orange', text: 'Equipment' }
    };

    const config = categoryConfig[category] || categoryConfig.general;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} text-white`}>
        {config.text}
      </span>
    );
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) {
      return { color: 'bg-red', text: 'Out of Stock' };
    } else if (quantity < 10) {
      return { color: 'bg-yellow-500', text: 'Low Stock' };
    } else {
      return { color: 'bg-green', text: 'In Stock' };
    }
  };

  const chartData = [
    {
      month: '2025-08',
      totalItems: inventory.length,
      totalValue: inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0),
      lowStock: inventory.filter(item => (item.quantity || 0) < 10).length
    }
  ];

  const categoryData = [
    { name: 'General', value: inventory.filter(item => item.category === 'general').length },
    { name: 'Electronics', value: inventory.filter(item => item.category === 'electronics').length },
    { name: 'Furniture', value: inventory.filter(item => item.category === 'furniture').length },
    { name: 'Supplies', value: inventory.filter(item => item.category === 'supplies').length },
    { name: 'Equipment', value: inventory.filter(item => item.category === 'equipment').length }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading inventory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Inventory</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Add Item'}
        </button>
      </div>

      {/* Create Item Form */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Inventory Item</h3>
          <form onSubmit={handleCreateItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  className="input w-full"
                  required
                >
                  <option value="general">General</option>
                  <option value="electronics">Electronics</option>
                  <option value="furniture">Furniture</option>
                  <option value="supplies">Supplies</option>
                  <option value="equipment">Equipment</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({...newItem, unitPrice: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={newItem.description}
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                className="input w-full"
                required
              />
            </div>
            <button type="submit" className="btn btn-success">
              Add Item
            </button>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Items</h3>
          <p className="text-2xl font-bold text-white">{inventory.length}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Value</h3>
          <p className="text-2xl font-bold text-green">
            ${inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Low Stock</h3>
          <p className="text-2xl font-bold text-yellow-500">
            {inventory.filter(item => (item.quantity || 0) < 10).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Out of Stock</h3>
          <p className="text-2xl font-bold text-red">
            {inventory.filter(item => (item.quantity || 0) === 0).length}
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
              onClick={() => setFilter('in-stock')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'in-stock' ? 'bg-green text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => setFilter('low-stock')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'low-stock' ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setFilter('out-of-stock')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'out-of-stock' ? 'bg-red text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Out of Stock
            </button>
          </div>
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full md:w-64"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Inventory Overview</h3>
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
                <Line type="monotone" dataKey="totalItems" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="lowStock" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Category Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
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
      </div>

      {/* Inventory Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Inventory Details</h3>
        
        {filteredInventory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No inventory items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Value</th>
                  <th>Stock Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const stockStatus = getStockStatus(item.quantity || 0);
                  const totalValue = (item.quantity || 0) * (item.unitPrice || 0);
                  
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-white font-medium">{item.name}</p>
                            <p className="text-gray-400 text-sm">Inventory Item</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {getCategoryBadge(item.category || 'general')}
                      </td>
                      <td>
                        <span className={`font-semibold ${
                          (item.quantity || 0) === 0 ? 'text-red' : 
                          (item.quantity || 0) < 10 ? 'text-yellow-500' : 'text-green'
                        }`}>
                          {item.quantity || 0}
                        </span>
                      </td>
                      <td>
                        <span className="text-gray-300">
                          ${(item.unitPrice || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-green">
                          ${totalValue.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stockStatus.color} text-white`}>
                          {stockStatus.text}
                        </span>
                      </td>
                      <td>
                        <span className="text-gray-300 text-sm">
                          {item.description || 'No description'}
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

export default Inventory;
