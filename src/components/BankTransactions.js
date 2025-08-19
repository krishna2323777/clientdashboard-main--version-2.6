import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const BankTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    type: 'credit',
    date: new Date().toISOString().split('T')[0]
  });

  const API_BASE_URL = 'http://financial-dashboard-env-env.eba-3ffzqmwy.ap-south-1.elasticbeanstalk.com';

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/`);
      const bankTransactions = response.data.filter(t => t.category === 'bank-transactions');
      setTransactions(bankTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      toast.error('Failed to fetch bank transactions');
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'credits' && transaction.type === 'credit') ||
                         (filter === 'debits' && transaction.type === 'debit');
    
    const matchesSearch = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      const transactionData = {
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount),
        type: newTransaction.type,
        date: newTransaction.date,
        category: 'bank-transactions',
        status: 'completed'
      };

      await axios.post(`${API_BASE_URL}/transactions/`, transactionData);
      toast.success('Transaction created successfully');
      setShowCreateForm(false);
      setNewTransaction({ description: '', amount: '', type: 'credit', date: new Date().toISOString().split('T')[0] });
      fetchTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction');
    }
  };

  const calculateBalance = () => {
    let balance = 0;
    transactions.forEach(transaction => {
      if (transaction.type === 'credit') {
        balance += transaction.amount || 0;
      } else {
        balance -= transaction.amount || 0;
      }
    });
    return balance;
  };

  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalBalance = calculateBalance();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading bank transactions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Bank Transactions</h1>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <div className="w-3 h-0.5 bg-gray-600 mb-1"></div>
            <div className="w-3 h-0.5 bg-gray-600"></div>
          </div>
          <span className="text-white text-sm">Transaction Management</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-row gap-6">
        <div className="card flex-1">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-gray-400 text-sm font-medium mb-2">Total Balance</h3>
              <p className="text-3xl font-bold text-white">${totalBalance.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card flex-1">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-gray-400 text-sm font-medium mb-2">Total Credits</h3>
              <p className="text-3xl font-bold text-green">${totalCredits.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card flex-1">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-gray-400 text-sm font-medium mb-2">Total Debits</h3>
              <p className="text-3xl font-bold text-red">${totalDebits.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-red rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter, and Add Transaction */}
      <div className="card">
        <div className="flex flex-row gap-4 items-center w-full">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-32 flex-shrink-0"
          >
            <option value="all">All Types</option>
            <option value="credits">Credits</option>
            <option value="debits">Debits</option>
          </select>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Transaction
          </button>
        </div>
      </div>

      {/* Create Transaction Form */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Transaction</h3>
          <form onSubmit={handleCreateTransaction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Type</label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <button type="submit" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
              Create Transaction
            </button>
          </form>
        </div>
      )}

      {/* Transaction History */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
        
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-400">No bank transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">DATE</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">DESCRIPTION</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">TYPE</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">AMOUNT</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, index) => {
                  // Calculate running balance
                  let runningBalance = 0;
                  for (let i = 0; i <= index; i++) {
                    const t = filteredTransactions[i];
                    if (t.type === 'credit') {
                      runningBalance += t.amount || 0;
                    } else {
                      runningBalance -= t.amount || 0;
                    }
                  }
                  
                  return (
                    <tr key={transaction.id} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="py-3 px-4 text-gray-300">
                        {new Date(transaction.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {transaction.description || transaction.name || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          transaction.type === 'credit' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-red-500 text-white'
                        }`}>
                          {transaction.type === 'credit' ? 'credit' : 'debit'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${
                          transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}${(transaction.amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">
                          ${runningBalance.toLocaleString()}
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

export default BankTransactions;
