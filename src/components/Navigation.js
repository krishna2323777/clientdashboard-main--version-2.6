import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard'
    },
    { 
      path: '/bank-transactions', 
      label: 'Bank Transactions'
    },
    { 
      path: '/invoices', 
      label: 'Invoices'
    },
    { 
      path: '/bills', 
      label: 'Bills'
    },
    { 
      path: '/inventory', 
      label: 'Inventory'
    },
    { 
      path: '/item-restocks', 
      label: 'Item Restocks'
    },
    { 
      path: '/manual-journals', 
      label: 'Manual Journals'
    },
    { 
      path: '/general-ledgers', 
      label: 'General Ledgers'
    },
    { 
      path: '/general-entries', 
      label: 'General Entries'
    },
    { 
      path: '/financial-statements', 
      label: 'Financial Statements'
    },
    { 
      path: '/annual-report', 
      label: 'Annual Report'
    }
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-nav-dark shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-nav-logo rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">F</span>
              </div>
              <h1 className="text-xl font-bold text-white">
                FinanceAI
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'bg-nav-active text-white px-4 py-2 rounded-lg shadow-lg'
                    : 'text-white hover:text-gray-300'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-white hover:text-gray-300 p-2 rounded-lg hover:bg-nav-hover transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-nav-border bg-nav-dark">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`mobile-nav-item block px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-nav-active text-white'
                      : 'text-white hover:bg-nav-hover'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active page indicator */}
      <div className="h-1 bg-gradient-to-r from-nav-gradient-start via-nav-gradient-mid to-nav-gradient-end"></div>
    </nav>
  );
};

export default Navigation;
