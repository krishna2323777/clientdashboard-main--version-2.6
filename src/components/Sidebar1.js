import React from 'react';

export const Sidebar = ({ activeSection, onSectionChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'bank-transactions', label: 'Bank Transactions', icon: '🏦' },
    { id: 'invoices', label: 'Invoices', icon: '📄' },
    { id: 'bills', label: 'Bills', icon: '💰' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'item-restocks', label: 'Item Restocks', icon: '🔄' },
    { id: 'manual-journals', label: 'Manual Journals', icon: '📝' },
    { id: 'general-ledgers', label: 'General Ledgers', icon: '📚' },
    { id: 'general-entries', label: 'General Entries', icon: '✏️' },
    { id: 'financial-statements', label: 'Financial Statements', icon: '📈' },
    { id: 'full-financial-statement', label: 'Full Financial Statement', icon: '📊' }
  ];

  return (
    <aside className="w-64 bg-[#1a1a2e] min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Financial Hub</h1>
        <p className="text-gray-400 text-sm">Complete Financial Management</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
              activeSection === item.id
                ? 'bg-[#667eea] text-white shadow-lg'
                : 'text-gray-300 hover:bg-[#2a2a3e] hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="mt-8 pt-8 border-t border-gray-700">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#667eea] rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-white text-xl">👤</span>
          </div>
          <p className="text-white font-medium">Financial Manager</p>
          <p className="text-gray-400 text-sm">Admin Access</p>
        </div>
      </div>
    </aside>
  );
};
