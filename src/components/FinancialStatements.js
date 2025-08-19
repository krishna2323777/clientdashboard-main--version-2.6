import React, { useState, useEffect } from 'react';
import { TrendingUp, FileText, Calculator, DollarSign, Download, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RAW_BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL;
const BACKEND_BASE_URL = RAW_BACKEND_BASE_URL?.replace(/\/$/, '');

if (!BACKEND_BASE_URL) {
  console.error("REACT_APP_BACKEND_URL is not set! Please check your .env files.");
  throw new Error("Backend URL is not configured.");
}

const FinancialStatements = () => {
  const [activeTab, setActiveTab] = useState('balance-sheet');
  const [isGenerating, setIsGenerating] = useState(false);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchFinancialStatements();
  }, []);

  const fetchFinancialStatements = async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/transactions/`);
      const transactionsData = await response.json();
      
      const financialResponse = await fetch(`${BACKEND_BASE_URL}/generate-financial-statements/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: transactionsData }),
      });
      
      if (!financialResponse.ok) throw new Error('Backend error');
      const statements = await financialResponse.json();
      
      setFinancialData(statements);
      setTransactions(transactionsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching financial statements:', error);
      setLoading(false);
    }
  };

  const generateStatements = async () => {
    setIsGenerating(true);
    try {
      // Call backend to generate financial statements based on current transactions
      const response = await fetch(`${BACKEND_BASE_URL}/generate-financial-statements/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: transactions }),
      });
      if (!response.ok) throw new Error('Backend error');
      const statements = await response.json();
      setFinancialData(statements);
    } catch (error) {
      console.error('Error generating financial statements:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 20;

    // Company Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL STATEMENTS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Statement Title
    let statementTitle = '';
    switch (activeTab) {
      case 'balance-sheet':
        statementTitle = 'BALANCE SHEET';
        break;
      case 'profit-loss':
        statementTitle = 'PROFIT & LOSS STATEMENT';
        break;
      case 'trial-balance':
        statementTitle = 'TRIAL BALANCE';
        break;
      case 'cash-flow':
        statementTitle = 'CASH FLOW STATEMENT';
        break;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(statementTitle, margin, yPosition);
    yPosition += 10;

    // Add statement content based on active tab using autoTable
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

         if (activeTab === 'balance-sheet' && financialData?.groupedBalanceSheet) {
       const grouped = financialData.groupedBalanceSheet;
       const mainGroups = ['Assets', 'Liabilities', 'Equity'];
       mainGroups.forEach(group => {
         autoTable(doc, {
           startY: yPosition,
           head: [[group, 'Amount (€)']],
           body: (grouped[group] || []).map(item => [item.account, item.amount !== 0 ? `€${item.amount.toLocaleString()}` : '']),
           theme: 'grid',
           headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
           styles: { halign: 'left' },
           columnStyles: { 1: { halign: 'right' } },
           margin: { left: margin, right: margin },
         });
         yPosition = doc.lastAutoTable.finalY + 4;
         // Group total
         const total = (grouped[group] || []).reduce((sum, item) => sum + (item.amount || 0), 0);
         autoTable(doc, {
           startY: yPosition,
           body: [[`Total ${group}`, `€${total.toLocaleString()}`]],
           theme: 'plain',
           styles: { fontStyle: 'bold', halign: 'right' },
           columnStyles: { 1: { halign: 'right' } },
           margin: { left: margin, right: margin },
         });
         yPosition = doc.lastAutoTable.finalY + 8;
       });
       // Grand total
       const grandTotal = mainGroups.reduce((sum, group) => sum + (grouped[group] || []).reduce((s, i) => s + (i.amount || 0), 0), 0);
       autoTable(doc, {
         startY: yPosition,
         body: [['Total Liabilities and Equity', `€${grandTotal.toLocaleString()}`]],
         theme: 'plain',
         styles: { fontStyle: 'bold', halign: 'right' },
         columnStyles: { 1: { halign: 'right' } },
         margin: { left: margin, right: margin },
       });
     } else if (activeTab === 'balance-sheet' && financialData?.balanceSheet) {
       // Fallback to regular balance sheet if grouped data not available
       const balanceSheet = financialData.balanceSheet;
       const assets = balanceSheet.filter(item => item.type === 'asset');
       const liabilities = balanceSheet.filter(item => item.type === 'liability');
       const equity = balanceSheet.filter(item => item.type === 'equity');
       
       // Assets
       if (assets.length > 0) {
         autoTable(doc, {
           startY: yPosition,
           head: [['Assets', 'Amount (€)']],
           body: assets.map(item => [item.account, `€${item.amount.toLocaleString()}`]),
           theme: 'grid',
           headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
           styles: { halign: 'left' },
           columnStyles: { 1: { halign: 'right' } },
           margin: { left: margin, right: margin },
         });
         yPosition = doc.lastAutoTable.finalY + 4;
         const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
         autoTable(doc, {
           startY: yPosition,
           body: [['Total Assets', `€${totalAssets.toLocaleString()}`]],
           theme: 'plain',
           styles: { fontStyle: 'bold', halign: 'right' },
           columnStyles: { 1: { halign: 'right' } },
           margin: { left: margin, right: margin },
         });
         yPosition = doc.lastAutoTable.finalY + 8;
       }
       
       // Liabilities and Equity
       const liabilitiesAndEquity = [...liabilities, ...equity];
       if (liabilitiesAndEquity.length > 0) {
         autoTable(doc, {
           startY: yPosition,
           head: [['Liabilities & Equity', 'Amount (€)']],
           body: liabilitiesAndEquity.map(item => [item.account, `€${item.amount.toLocaleString()}`]),
           theme: 'grid',
           headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
           styles: { halign: 'left' },
           columnStyles: { 1: { halign: 'right' } },
           margin: { left: margin, right: margin },
         });
         yPosition = doc.lastAutoTable.finalY + 4;
         const totalLiabilitiesEquity = liabilitiesAndEquity.reduce((sum, item) => sum + item.amount, 0);
         autoTable(doc, {
           startY: yPosition,
           body: [['Total Liabilities and Equity', `€${totalLiabilitiesEquity.toLocaleString()}`]],
           theme: 'plain',
           styles: { fontStyle: 'bold', halign: 'right' },
           columnStyles: { 1: { halign: 'right' } },
           margin: { left: margin, right: margin },
         });
       }
     }

    if (activeTab === 'profit-loss' && financialData?.detailedProfitLoss && financialData.detailedProfitLoss.length > 0) {
      // Use same formatting as balance sheet/trial balance
      autoTable(doc, {
        startY: yPosition,
        head: [['Accounts', 'Amount (€)']],
        body: financialData.detailedProfitLoss.map(row => [
          row.label,
          row.amount === '' || row.amount === undefined ? '' : `€${Number(row.amount).toLocaleString()}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { halign: 'left' },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
        didParseCell: function (data) {
          // Bold for totals and key rows
          if (data.section === 'body' &&
            /Total|Gross Profit|Operating Profit|Profit Before Tax|Net Profit/.test(data.row.raw[0])) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });
      yPosition = doc.lastAutoTable.finalY + 4;
    }

         if (activeTab === 'trial-balance' && financialData?.groupedTrialBalance) {
       const grouped = financialData.groupedTrialBalance;
       const mainGroups = ['Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses'];
       mainGroups.forEach(group => {
         autoTable(doc, {
           startY: yPosition,
           head: [[group, 'Debit (Dr.)', 'Credit (Cr.)']],
           body: (grouped[group] || []).map(item => [item.account, item.debit > 0 ? `€${item.debit.toLocaleString()}` : '', item.credit > 0 ? `€${item.credit.toLocaleString()}` : '']),
           theme: 'grid',
           headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
           styles: { halign: 'left' },
           columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
           margin: { left: margin, right: margin },
         });
         yPosition = doc.lastAutoTable.finalY + 4;
         // Group total
         const debit = (grouped[group] || []).reduce((sum, item) => sum + (item.debit || 0), 0);
         const credit = (grouped[group] || []).reduce((sum, item) => sum + (item.credit || 0), 0);
         autoTable(doc, {
           startY: yPosition,
           body: [[`Total ${group}`, `€${debit.toLocaleString()}`, `€${credit.toLocaleString()}`]],
           theme: 'plain',
           styles: { fontStyle: 'bold', halign: 'right' },
           columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
           margin: { left: margin, right: margin },
         });
         yPosition = doc.lastAutoTable.finalY + 8;
       });
       // Grand total
       const grandDebit = mainGroups.reduce((sum, group) => sum + (grouped[group] || []).reduce((s, i) => s + (i.debit || 0), 0), 0);
       const grandCredit = mainGroups.reduce((sum, group) => sum + (grouped[group] || []).reduce((s, i) => s + (i.credit || 0), 0), 0);
       autoTable(doc, {
         startY: yPosition,
         body: [['Grand Total', `€${grandDebit.toLocaleString()}`, `€${grandCredit.toLocaleString()}`]],
         theme: 'plain',
         styles: { fontStyle: 'bold', halign: 'right' },
         columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
         margin: { left: margin, right: margin },
       });
     } else if (activeTab === 'trial-balance' && financialData?.trialBalance) {
       // Fallback to regular trial balance if grouped data not available
       const trialBalance = financialData.trialBalance;
       autoTable(doc, {
         startY: yPosition,
         head: [['Account', 'Debit (Dr.)', 'Credit (Cr.)']],
         body: trialBalance.map(item => [
           item.account,
           item.debit > 0 ? `€${item.debit.toLocaleString()}` : '',
           item.credit > 0 ? `€${item.credit.toLocaleString()}` : ''
         ]),
         theme: 'grid',
         headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
         styles: { halign: 'left' },
         columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
         margin: { left: margin, right: margin },
       });
       yPosition = doc.lastAutoTable.finalY + 4;
       // Grand total
       const grandDebit = trialBalance.reduce((sum, item) => sum + (item.debit || 0), 0);
       const grandCredit = trialBalance.reduce((sum, item) => sum + (item.credit || 0), 0);
       autoTable(doc, {
         startY: yPosition,
         body: [['Grand Total', `€${grandDebit.toLocaleString()}`, `€${grandCredit.toLocaleString()}`]],
         theme: 'plain',
         styles: { fontStyle: 'bold', halign: 'right' },
         columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
         margin: { left: margin, right: margin },
       });
     }

    if (activeTab === 'cash-flow' && financialData?.cashFlow && financialData.cashFlow.length > 0) {
      const cashFlow = financialData.cashFlow;
      autoTable(doc, {
        startY: yPosition,
        head: [['Section', 'Particulars', 'Amount ($)']],
        body: cashFlow.map(item => [item.type, item.description, `$${item.amount.toLocaleString()}`]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { halign: 'left' },
        columnStyles: { 2: { halign: 'right' } },
        margin: { left: margin, right: margin },
      });
      yPosition = doc.lastAutoTable.finalY + 4;
      // Net Cash Flow row
      const netCashFlow = cashFlow.find(item => item.description === 'Cash from Operations')?.amount || 0;
      autoTable(doc, {
        startY: yPosition,
        body: [['', 'Net Cash Flow', `$${netCashFlow.toLocaleString()}`]],
        theme: 'plain',
        styles: { fontStyle: 'bold', halign: 'right' },
        columnStyles: { 2: { halign: 'right' } },
        margin: { left: margin, right: margin },
      });
    }

    // Save the PDF
    doc.save(`financial-statement-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportExcel = () => {
    let data = [];
    let sheetName = '';
    
    switch (activeTab) {
      case 'balance-sheet':
        if (financialData?.groupedBalanceSheet) {
          const grouped = financialData.groupedBalanceSheet;
          const mainGroups = ['Assets', 'Liabilities', 'Equity'];
          mainGroups.forEach(group => {
            const items = grouped[group] || [];
            items.forEach(item => {
              data.push({
                'Group': group,
                'Account': item.account,
                'Amount (€)': item.amount !== 0 ? item.amount : ''
              });
            });
            // Add group total
            const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
            data.push({
              'Group': group,
              'Account': `Total ${group}`,
              'Amount (€)': total
            });
            data.push({ 'Group': '', 'Account': '', 'Amount (€)': '' }); // Empty row
          });
        } else {
          data = financialData?.balanceSheet || [];
        }
        sheetName = 'Balance Sheet';
        break;
        
      case 'profit-loss':
        if (financialData?.detailedProfitLoss && financialData.detailedProfitLoss.length > 0) {
          data = financialData.detailedProfitLoss.map(row => ({
            'Accounts': row.label,
            'Amount (€)': row.amount === '' || row.amount === undefined ? '' : Number(row.amount)
          }));
        } else {
          data = financialData?.profitLoss || [];
        }
        sheetName = 'Profit & Loss';
        break;
        
      case 'trial-balance':
        if (financialData?.groupedTrialBalance) {
          const grouped = financialData.groupedTrialBalance;
          const mainGroups = ['Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses'];
          mainGroups.forEach(group => {
            const items = grouped[group] || [];
            items.forEach(item => {
              data.push({
                'Group': group,
                'Account': item.account,
                'Debit (Dr.)': item.debit > 0 ? item.debit : '',
                'Credit (Cr.)': item.credit > 0 ? item.credit : ''
              });
            });
            // Add group total
            const debit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
            const credit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
            data.push({
              'Group': group,
              'Account': `Total ${group}`,
              'Debit (Dr.)': debit,
              'Credit (Cr.)': credit
            });
            data.push({ 'Group': '', 'Account': '', 'Debit (Dr.)': '', 'Credit (Cr.)': '' }); // Empty row
          });
        } else {
          data = financialData?.trialBalance || [];
        }
        sheetName = 'Trial Balance';
        break;
        
      case 'cash-flow':
        data = financialData?.cashFlow || [];
        sheetName = 'Cash Flow';
        break;
        
      default:
        return;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `financial-statement-${activeTab}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const StatementTab = ({ id, label, icon: Icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
        isActive
          ? 'bg-blue-100 text-blue-700 shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  const TrialBalanceTable = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto p-6">
      <div className="text-center mb-6">
        <h4 className="text-2xl font-bold text-gray-900 mb-2">
          TRIAL BALANCE
        </h4>
        <p className="text-gray-600">
          As on {new Date().toLocaleDateString('en-GB')}
        </p>
      </div>
      {(!financialData?.trialBalance || financialData.trialBalance.length === 0) ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No trial balance data available. Generate statements to view data.</p>
        </div>
      ) : (
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">S. No.</th>
              <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Particulars (Account Name)</th>
              <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Debit ($)</th>
              <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Credit ($)</th>
            </tr>
          </thead>
          <tbody>
            {financialData.trialBalance.map((item, idx) => (
              <tr key={item.account + idx} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4 border border-gray-300 text-center font-medium">{idx + 1}</td>
                <td className="py-3 px-4 border border-gray-300 font-medium">{item.account}</td>
                <td className="py-3 px-4 border border-gray-300 text-right">
                  {item.debit > 0 ? `$${item.debit.toLocaleString()}` : ''}
                </td>
                <td className="py-3 px-4 border border-gray-300 text-right">
                  {item.credit > 0 ? `$${item.credit.toLocaleString()}` : ''}
                </td>
              </tr>
            ))}
            <tr className="font-bold bg-gray-100">
              <td colSpan={2} className="py-3 px-4 border border-gray-300 text-right font-semibold">Total</td>
              <td className="py-3 px-4 border border-gray-300 text-right font-semibold">
                ${financialData.trialBalance.reduce((sum, item) => sum + item.debit, 0).toLocaleString()}
              </td>
              <td className="py-3 px-4 border border-gray-300 text-right font-semibold">
                ${financialData.trialBalance.reduce((sum, item) => sum + item.credit, 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );

  const BalanceSheetTable = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
      <div className="text-center mb-6">
        <h4 className="text-2xl font-bold text-gray-900 mb-2">
          BALANCE SHEET
        </h4>
        <p className="text-gray-600">
          As on {new Date().toLocaleDateString('en-GB')}
        </p>
      </div>
      {(!financialData?.balanceSheet || financialData.balanceSheet.length === 0) ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No balance sheet data available. Generate statements to view data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assets Table */}
          <div>
            <h5 className="font-bold text-blue-700 mb-4 text-lg">🟦 ASSETS</h5>
            <table className="min-w-full border border-gray-300 mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Category</th>
                  <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Account</th>
                  <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Amount ($)</th>
                </tr>
              </thead>
              <tbody>
                {financialData.balanceSheet
                  .filter(item => item.type === 'asset')
                  .map((item, idx) => (
                    <tr key={item.account + idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 border border-gray-300">{item.category}</td>
                      <td className="py-3 px-4 border border-gray-300 font-medium">{item.account}</td>
                      <td className="py-3 px-4 border border-gray-300 text-right font-medium">${item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                <tr className="font-bold bg-gray-100">
                  <td colSpan={2} className="py-3 px-4 border border-gray-300 text-right font-semibold">Total Assets</td>
                  <td className="py-3 px-4 border border-gray-300 text-right font-semibold">
                    ${financialData.balanceSheet
                      .filter(item => item.type === 'asset')
                      .reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Equity & Liabilities Table */}
          <div>
            <h5 className="font-bold text-red-700 mb-4 text-lg">🟥 EQUITY AND LIABILITIES</h5>
            <table className="min-w-full border border-gray-300 mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Category</th>
                  <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Account</th>
                  <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Amount ($)</th>
                </tr>
              </thead>
              <tbody>
                {financialData.balanceSheet
                  .filter(item => item.type === 'liability' || item.type === 'equity')
                  .map((item, idx) => (
                    <tr key={item.account + idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 border border-gray-300">{item.category}</td>
                      <td className="py-3 px-4 border border-gray-300 font-medium">{item.account}</td>
                      <td className="py-3 px-4 border border-gray-300 text-right font-medium">${item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                <tr className="font-bold bg-gray-100">
                  <td colSpan={2} className="py-3 px-4 border border-gray-300 text-right font-semibold">Total Equity & Liabilities</td>
                  <td className="py-3 px-4 border border-gray-300 text-right font-semibold">
                    ${financialData.balanceSheet
                      .filter(item => item.type === 'liability' || item.type === 'equity')
                      .reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const ProfitLossTable = () => {
    // Use detailedProfitLoss if available, otherwise fall back to profitLoss
    const detailedPL = financialData?.detailedProfitLoss && financialData.detailedProfitLoss.length > 0
      ? financialData.detailedProfitLoss
      : (financialData?.profitLoss || []);
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
        <div className="text-center mb-6">
          <h4 className="text-2xl font-bold text-gray-900 mb-2">
            Profit & Loss Statement (For the Period Ending December 2025)
          </h4>
        </div>
        {detailedPL.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No profit & loss data available. Generate statements to view data.</p>
          </div>
        ) : (
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Accounts</th>
                <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Amount (€)</th>
              </tr>
            </thead>
            <tbody>
              {detailedPL.map((row, idx) => (
                <tr key={row.label ? row.label + idx : row.account + idx} className={/Total|Gross Profit|Operating Profit|Profit Before Tax|Net Profit/.test(row.label || row.account) ? "font-bold bg-gray-100" : ""}>
                  <td className="py-3 px-4 border border-gray-300 font-medium">{row.label || row.account}</td>
                  <td className="py-3 px-4 border border-gray-300 text-right font-medium">
                    {row.amount === "" || row.amount === undefined ? '' : `€${Number(row.amount).toLocaleString()}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* Notes Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="font-bold mb-2">📌 Notes:</div>
          <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
            <li>Use this structure for internal monthly/annual reporting.</li>
            <li>Ensure revenue, cost, and expenses follow accounting standards (GAAP/IFRS).</li>
            <li><b>Gross Profit</b> = Revenue - COGS</li>
            <li><b>Net Profit</b> = Operating Profit ± Other Income/Expenses − Tax</li>
          </ul>
        </div>
      </div>
    );
  };

  const CashFlowTable = () => {
    const cashFlow = financialData?.cashFlow || [];
    // Find the 'Cash from Operations' row for Net Cash Flow
    const netCashFlow = cashFlow.find(item => item.description === 'Cash from Operations')?.amount || 0;
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
        <div className="text-center mb-6">
          <h4 className="text-2xl font-bold text-gray-900 mb-2">
            CASH FLOW STATEMENT
          </h4>
          <p className="text-gray-600">
            Indirect Method, for the year ended {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>
        {cashFlow.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No cash flow data available. Generate statements to view data.</p>
          </div>
        ) : (
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Section</th>
                <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Particulars</th>
                <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Amount ($)</th>
              </tr>
            </thead>
            <tbody>
              {cashFlow.map((item, idx) => (
                <tr key={item.description + idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 border border-gray-300 font-medium">{item.type}</td>
                  <td className="py-3 px-4 border border-gray-300 font-medium">{item.description}</td>
                  <td className="py-3 px-4 border border-gray-300 text-right font-medium">${item.amount.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-100">
                <td colSpan={2} className="py-3 px-4 border border-gray-300 text-right font-semibold">Net Cash Flow</td>
                <td className="py-3 px-4 border border-gray-300 text-right font-semibold">
                  ${netCashFlow.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const GroupedTrialBalanceTable = () => {
    const grouped = financialData?.groupedTrialBalance || {};
    const mainGroups = ["Assets", "Liabilities", "Equity", "Revenue", "Expenses"];

    // Calculate totals
    const groupTotals = {};
    let grandDebit = 0;
    let grandCredit = 0;

    mainGroups.forEach(group => {
      const items = grouped[group] || [];
      const debit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
      const credit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
      groupTotals[group] = { debit, credit };
      grandDebit += debit;
      grandCredit += credit;
    });

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto p-6">
        <div className="text-center mb-6">
          <h4 className="text-2xl font-bold text-gray-900 mb-2">TRIAL BALANCE STATEMENT</h4>
          <p className="text-gray-600">As at December 2025</p>
        </div>
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Accounts</th>
              <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Debit (Dr.)</th>
              <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Credit (Cr.)</th>
            </tr>
          </thead>
          <tbody>
            {mainGroups.map((group) => (
              <React.Fragment key={group}>
                <tr className="bg-gray-100">
                  <td className="py-2 px-4 border border-gray-300 font-bold text-lg" colSpan={3}>{group}</td>
                </tr>
                {(grouped[group] || []).map((item, idx) => (
                  <tr key={item.account + idx}>
                    <td className="py-2 px-4 border border-gray-300 pl-8">└── {item.account}</td>
                    <td className="py-2 px-4 border border-gray-300 text-right">{item.debit > 0 ? `€${item.debit.toLocaleString()}` : ''}</td>
                    <td className="py-2 px-4 border border-gray-300 text-right">{item.credit > 0 ? `€${item.credit.toLocaleString()}` : ''}</td>
                  </tr>
                ))}
                {/* Group total */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-2 px-4 border border-gray-300 text-right">Total {group}</td>
                  <td className="py-2 px-4 border border-gray-300 text-right">€{groupTotals[group].debit.toLocaleString()}</td>
                  <td className="py-2 px-4 border border-gray-300 text-right">€{groupTotals[group].credit.toLocaleString()}</td>
                </tr>
              </React.Fragment>
            ))}
            {/* Grand total */}
            <tr className="bg-blue-100 font-bold">
              <td className="py-3 px-4 border border-gray-300 text-right">Grand Total</td>
              <td className="py-3 px-4 border border-gray-300 text-right">€{grandDebit.toLocaleString()}</td>
              <td className="py-3 px-4 border border-gray-300 text-right">€{grandCredit.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const GroupedBalanceSheetTable = () => {
    const grouped = financialData?.groupedBalanceSheet || {};
    const mainGroups = ["Assets", "Liabilities", "Equity"];

    // Helper to group by sub-account and sum if needed
    function groupBySubAccount(items) {
      const map = {};
      items.forEach(item => {
        if (!map[item.account]) map[item.account] = 0;
        map[item.account] += item.amount || 0;
      });
      return Object.entries(map).map(([account, amount]) => ({ account, amount }));
    }

    // Calculate group totals and grand total
    const groupTotals = {};
    let grandTotal = 0;
    mainGroups.forEach(group => {
      const items = groupBySubAccount(grouped[group] || []);
      const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      groupTotals[group] = total;
      grandTotal += total;
    });

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto p-6">
        <div className="text-center mb-6">
          <h4 className="text-2xl font-bold text-gray-900 mb-2">BALANCE SHEET STATEMENT</h4>
          <p className="text-gray-600">As at December 2025</p>
        </div>
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Accounts</th>
              <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Amount (€)</th>
            </tr>
          </thead>
          <tbody>
            {mainGroups.map((group) => (
              <React.Fragment key={group}>
                <tr className="bg-gray-100">
                  <td className="py-2 px-4 border border-gray-300 font-bold text-lg" colSpan={2}>{group}</td>
                </tr>
                {groupBySubAccount(grouped[group] || []).map((item, idx) => (
                  <React.Fragment key={item.account + idx}>
                    <tr>
                      <td className="py-2 px-4 border border-gray-300 pl-8">└── {item.account}</td>
                      <td className="py-2 px-4 border border-gray-300 text-right">{item.amount !== 0 ? `€${item.amount.toLocaleString()}` : ''}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-2 px-4 border border-gray-300 text-right">└── Total {item.account}</td>
                      <td className="py-2 px-4 border border-gray-300 text-right">€{item.amount.toLocaleString()}</td>
                    </tr>
                  </React.Fragment>
                ))}
                {/* Group total */}
                <tr className="bg-gray-200 font-semibold">
                  <td className="py-2 px-4 border border-gray-300 text-right">Total {group}</td>
                  <td className="py-2 px-4 border border-gray-300 text-right">€{groupTotals[group].toLocaleString()}</td>
                </tr>
              </React.Fragment>
            ))}
            {/* Grand total */}
            <tr className="bg-blue-100 font-bold">
              <td className="py-3 px-4 border border-gray-300 text-right">Total Liabilities and Equity</td>
              <td className="py-3 px-4 border border-gray-300 text-right">€{grandTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'balance-sheet':
        return <GroupedBalanceSheetTable />;
      case 'profit-loss':
        return <ProfitLossTable />;
      case 'trial-balance':
        return <GroupedTrialBalanceTable />;
      case 'cash-flow':
        return <CashFlowTable />;
      default:
        return <GroupedBalanceSheetTable />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading financial statements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Financial Statements</h1>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <span className="text-sm text-gray-600">Professional Statement Generation</span>
        </div>
      </div>

      {/* Statement Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <StatementTab
            id="balance-sheet"
            label="Balance Sheet"
            icon={DollarSign}
            isActive={activeTab === 'balance-sheet'}
            onClick={() => setActiveTab('balance-sheet')}
          />
          <StatementTab
            id="profit-loss"
            label="Profit & Loss"
            icon={TrendingUp}
            isActive={activeTab === 'profit-loss'}
            onClick={() => setActiveTab('profit-loss')}
          />
          <StatementTab
            id="trial-balance"
            label="Trial Balance"
            icon={Calculator}
            isActive={activeTab === 'trial-balance'}
            onClick={() => setActiveTab('trial-balance')}
          />
          <StatementTab
            id="cash-flow"
            label="Cash Flow"
            icon={FileText}
            isActive={activeTab === 'cash-flow'}
            onClick={() => setActiveTab('cash-flow')}
          />
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {activeTab === 'balance-sheet' && 'Balance Sheet'}
              {activeTab === 'profit-loss' && 'Profit & Loss Statement'}
              {activeTab === 'trial-balance' && 'Trial Balance'}
              {activeTab === 'cash-flow' && 'Cash Flow Statement'}
            </h3>
            <p className="text-sm text-gray-600">
              As of {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
              onClick={generateStatements}
              disabled={isGenerating}
            >
              <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Generating...' : 'Generate Statements'}</span>
            </button>
            <button 
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              onClick={downloadPDF}
            >
              <Download className="w-5 h-5" />
              <span>Export PDF</span>
            </button>
            <button
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              onClick={exportExcel}
            >
              <Download className="w-5 h-5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {renderActiveTab()}
      </div>
    </div>
  );
};

export default FinancialStatements;
