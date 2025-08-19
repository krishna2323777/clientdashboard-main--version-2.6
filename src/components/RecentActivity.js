import React from 'react';

const RecentActivity = ({ transactions }) => {
  // Sort transactions by date (most recent first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  // Take only the last 5 transactions
  const recentTransactions = sortedTransactions.slice(0, 5);

  const getActivityDescription = (transaction) => {
    const category = transaction.category;
    const amount = transaction.amount;
    const type = transaction.type;

    if (category === 'bills') {
      return 'Expense document issued to the company';
    } else if (category === 'invoices') {
      return 'REVENUE';
    } else if (category === 'bank-transactions') {
      return 'Bank transaction processed';
    } else if (category === 'inventory') {
      return 'Inventory document processed';
    } else if (category === 'item-restocks') {
      return 'Item restock processed';
    } else if (category === 'manual-journals') {
      return 'Manual journal entry';
    } else if (category === 'general-ledgers') {
      return 'General ledger entry';
    } else if (category === 'general-entries') {
      return 'General entry processed';
    } else {
      return 'Document processed';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const getAmountDisplay = (transaction) => {
    const amount = transaction.amount || 0;
    const type = transaction.type;
    
    if (type === 'credit') {
      return `+$${amount.toLocaleString()}`;
    } else {
      return `+$${amount.toLocaleString()}`;
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      
      {recentTransactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentTransactions.map((transaction, index) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green rounded-full mr-3"></div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {getActivityDescription(transaction)}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {formatDate(transaction.date)}
                  </p>
                </div>
              </div>
              <span className="text-green font-semibold text-sm">
                {getAmountDisplay(transaction)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
