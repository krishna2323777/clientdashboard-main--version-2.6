import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, TrendingUp, FileText, Calculator, DollarSign, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const RAW_BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL;
const BACKEND_BASE_URL = RAW_BACKEND_BASE_URL?.replace(/\/$/, '');

if (!BACKEND_BASE_URL) {
  console.error("REACT_APP_BACKEND_URL is not set! Please check your .env files.");
  throw new Error("Backend URL is not configured.");
}

const AnnualReport = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Sample Company Ltd.',
    address: '123 Business Street, Business City',
    city: 'Business City',
    country: 'Netherlands',
    establishedDate: '2020-01-01',
    approvalDate: '2024-03-15',
    chamberOfCommerce: '12345678',
    owner: 'John Doe',
    financialYear: '2024',
    logo: null
  });

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
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
      console.error('Error fetching financial data:', error);
      setLoading(false);
    }
  };

  const generateAnnualReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/generate-financial-statements/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: transactions }),
      });
      if (!response.ok) throw new Error('Backend error');
      const statements = await response.json();
      setFinancialData(statements);
    } catch (error) {
      console.error('Error generating annual report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // PDF Export Handler
  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 60;
    let pageNum = 1;
    
    const addPageNumber = () => {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${pageNum}`, pageWidth - 60, pageHeight - 30, { align: 'right' });
      pageNum++;
    };

    // --- Cover Page ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('ANNUAL REPORT', pageWidth / 2, y, { align: 'center' });
    y += 40;
    
    doc.setFontSize(14);
    doc.text('To the board of', pageWidth / 2, y, { align: 'center' });
    y += 30;
    
    doc.setFontSize(18);
    doc.text(companyInfo.name, pageWidth / 2, y, { align: 'center' });
    y += 40;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(companyInfo.address, pageWidth / 2, y, { align: 'center' });
    y += 25;
    
    if (companyInfo.city) { 
      doc.text(companyInfo.city, pageWidth / 2, y, { align: 'center' }); 
      y += 25; 
    }
    
    if (companyInfo.country) { 
      doc.text(companyInfo.country, pageWidth / 2, y, { align: 'center' }); 
      y += 25; 
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Financial Year ${companyInfo.financialYear}`, pageWidth / 2, y + 20, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Date established:', 60, y + 60);
    doc.text(companyInfo.establishedDate, 200, y + 60);
    
    addPageNumber();
    doc.addPage();

    // --- Executive Summary ---
    y = 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Executive Summary', 60, y);
    y += 30;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const summaryText = doc.splitTextToSize(
      `This annual report presents a comprehensive overview of ${companyInfo.name}'s financial performance and position for the year ended ${companyInfo.financialYear}. The company has demonstrated strong financial resilience and strategic growth throughout the reporting period.`,
      pageWidth - 120
    );
    doc.text(summaryText, 60, y);
    y += summaryText.length * 16 + 20;
    
    addPageNumber();
    doc.addPage();

    // --- Financial Highlights ---
    y = 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Financial Highlights', 60, y);
    y += 30;
    
    if (financialData?.profitLoss && financialData.profitLoss.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Key Metrics', 'Amount (€)']],
        body: [
          ['Total Revenue', financialData.profitLoss.filter(i => i.type === 'revenue').reduce((sum, i) => sum + i.amount, 0).toLocaleString()],
          ['Total Expenses', financialData.profitLoss.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0).toLocaleString()],
          ['Net Profit/Loss', financialData.profitLoss.reduce((sum, i) => sum + (i.type === 'revenue' ? i.amount : -i.amount), 0).toLocaleString()]
        ],
        margin: { left: 60, right: 60 },
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 12 },
      });
      y = doc.lastAutoTable.finalY + 20;
    }
    
    addPageNumber();
    doc.addPage();

    // --- Balance Sheet ---
    y = 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Balance Sheet', 60, y);
    y += 30;
    
    if (financialData?.balanceSheet && financialData.balanceSheet.length > 0) {
      // Assets
      const assets = financialData.balanceSheet.filter(i => i.type === 'asset');
      if (assets.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Assets', 'Amount (€)']],
          body: assets.map(i => [i.account, i.amount.toLocaleString()]),
          margin: { left: 60, right: 60 },
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          styles: { fontSize: 12 },
        });
        y = doc.lastAutoTable.finalY + 20;
      }
      
      // Liabilities and Equity
      const liabilitiesEquity = financialData.balanceSheet.filter(i => i.type === 'liability' || i.type === 'equity');
      if (liabilitiesEquity.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Liabilities & Equity', 'Amount (€)']],
          body: liabilitiesEquity.map(i => [i.account, i.amount.toLocaleString()]),
          margin: { left: 60, right: 60 },
          theme: 'grid',
          headStyles: { fillColor: [185, 41, 41], textColor: 255 },
          styles: { fontSize: 12 },
        });
      }
    }
    
    addPageNumber();
    doc.addPage();

    // --- Profit & Loss ---
    y = 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Profit & Loss Statement', 60, y);
    y += 30;
    
    if (financialData?.profitLoss && financialData.profitLoss.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Account', 'Amount (€)']],
        body: financialData.profitLoss.map(i => [i.account, i.amount.toLocaleString()]),
        margin: { left: 60, right: 60 },
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 12 },
      });
    }
    
    addPageNumber();
    doc.addPage();

    // --- Management Discussion ---
    y = 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Management Discussion & Analysis', 60, y);
    y += 30;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const managementText = doc.splitTextToSize(
      `The management team of ${companyInfo.name} is pleased to present this annual report for the financial year ${companyInfo.financialYear}. The company has maintained its commitment to operational excellence and strategic growth while navigating the dynamic business environment.`,
      pageWidth - 120
    );
    doc.text(managementText, 60, y);
    y += managementText.length * 16 + 20;
    
    addPageNumber();
    doc.addPage();

    // --- Risk Analysis ---
    y = 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Risk Analysis', 60, y);
    y += 30;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const riskText = doc.splitTextToSize(
      'The company identifies and manages various risks including market risks, operational risks, and financial risks. Regular risk assessments are conducted to ensure appropriate mitigation strategies are in place.',
      pageWidth - 120
    );
    doc.text(riskText, 60, y);
    
    addPageNumber();
    doc.addPage();

    // --- Future Outlook ---
    y = 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Future Outlook', 60, y);
    y += 30;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const outlookText = doc.splitTextToSize(
      `Looking forward, ${companyInfo.name} is positioned for continued growth and success. The company will focus on expanding market presence, enhancing operational efficiency, and maintaining strong financial discipline.`,
      pageWidth - 120
    );
    doc.text(outlookText, 60, y);
    
    addPageNumber();
    doc.addPage();

    // --- Signature Page ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`${companyInfo.city || ''}, ${companyInfo.country || ''}, ${companyInfo.approvalDate || ''}`, 60, 100);
    doc.setFont('helvetica', 'bold');
    doc.text('Signature:', 60, 130);
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo.name, 60, 160);
    doc.text(companyInfo.owner, 60, 180);
    doc.text('Director', 60, 200);
    doc.text('..................', 60, 240);
    
    addPageNumber();
    doc.save(`Annual-Report-${companyInfo.name}-${companyInfo.financialYear}.pdf`);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // 1. Company Information Sheet
    const companyData = [
      ['Company Information'],
      ['Company Name', companyInfo.name],
      ['Address', companyInfo.address],
      ['City', companyInfo.city],
      ['Country', companyInfo.country],
      ['Established Date', companyInfo.establishedDate],
      ['Financial Year', companyInfo.financialYear],
      ['Chamber of Commerce', companyInfo.chamberOfCommerce],
      ['Owner/Director', companyInfo.owner],
      [],
      ['Executive Summary'],
      [`This annual report presents a comprehensive overview of ${companyInfo.name}'s financial performance and position for the year ended ${companyInfo.financialYear}. The company has demonstrated strong financial resilience and strategic growth throughout the reporting period.`]
    ];
    
    const companySheet = XLSX.utils.aoa_to_sheet(companyData);
    XLSX.utils.book_append_sheet(workbook, companySheet, 'Company Info');
    
    // 2. Financial Highlights Sheet
    if (financialData?.profitLoss && financialData.profitLoss.length > 0) {
      const financialHighlights = [
        ['Key Metrics', 'Amount (€)'],
        ['Total Revenue', financialData.profitLoss.filter(i => i.type === 'revenue').reduce((sum, i) => sum + i.amount, 0)],
        ['Total Expenses', financialData.profitLoss.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0)],
        ['Net Profit/Loss', financialData.profitLoss.reduce((sum, i) => sum + (i.type === 'revenue' ? i.amount : -i.amount), 0)]
      ];
      
      const financialSheet = XLSX.utils.aoa_to_sheet(financialHighlights);
      XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financial Highlights');
    }
    
    // 3. Balance Sheet Sheet
    if (financialData?.balanceSheet && financialData.balanceSheet.length > 0) {
      const balanceSheetData = [
        ['Balance Sheet'],
        [],
        ['Assets', 'Amount (€)']
      ];
      
      // Add assets
      const assets = financialData.balanceSheet.filter(i => i.type === 'asset');
      assets.forEach(item => {
        balanceSheetData.push([item.account, item.amount]);
      });
      
      // Add total assets
      const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
      balanceSheetData.push(['Total Assets', totalAssets]);
      balanceSheetData.push([]);
      
      // Add liabilities and equity
      balanceSheetData.push(['Liabilities & Equity', 'Amount (€)']);
      const liabilitiesEquity = financialData.balanceSheet.filter(i => i.type === 'liability' || i.type === 'equity');
      liabilitiesEquity.forEach(item => {
        balanceSheetData.push([item.account, item.amount]);
      });
      
      // Add total liabilities and equity
      const totalLiabilitiesEquity = liabilitiesEquity.reduce((sum, item) => sum + item.amount, 0);
      balanceSheetData.push(['Total Liabilities & Equity', totalLiabilitiesEquity]);
      
      const balanceSheet = XLSX.utils.aoa_to_sheet(balanceSheetData);
      XLSX.utils.book_append_sheet(workbook, balanceSheet, 'Balance Sheet');
    }
    
    // 4. Profit & Loss Sheet
    if (financialData?.profitLoss && financialData.profitLoss.length > 0) {
      const profitLossData = [
        ['Profit & Loss Statement'],
        [],
        ['Account', 'Amount (€)']
      ];
      
      financialData.profitLoss.forEach(item => {
        profitLossData.push([item.account, item.amount]);
      });
      
      const profitLossSheet = XLSX.utils.aoa_to_sheet(profitLossData);
      XLSX.utils.book_append_sheet(workbook, profitLossSheet, 'Profit & Loss');
    }
    
    // 5. Monthly Performance Sheet
    const monthlyData = [
      ['Monthly Performance'],
      [],
      ['Month', 'Revenue (€)', 'Expenses (€)', 'Profit (€)']
    ];
    
    sampleData.forEach(item => {
      monthlyData.push([item.month, item.revenue, item.expenses, item.profit]);
    });
    
    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Performance');
    
    // 6. Analysis Sheet
    const analysisData = [
      ['Management Discussion & Analysis'],
      [],
      ['Section', 'Content'],
      ['Executive Summary', `The management team of ${companyInfo.name} is pleased to present this annual report for the financial year ${companyInfo.financialYear}.`],
      ['Risk Analysis', 'The company identifies and manages various risks including market risks, operational risks, and financial risks.'],
      ['Future Outlook', `Looking forward, ${companyInfo.name} is positioned for continued growth and success.`]
    ];
    
    const analysisSheet = XLSX.utils.aoa_to_sheet(analysisData);
    XLSX.utils.book_append_sheet(workbook, analysisSheet, 'Analysis');
    
    // Save the Excel file
    XLSX.writeFile(workbook, `Annual-Report-${companyInfo.name}-${companyInfo.financialYear}.xlsx`);
  };

  // Sample data for charts
  const sampleData = [
    { month: 'Jan', revenue: 50000, expenses: 35000, profit: 15000 },
    { month: 'Feb', revenue: 55000, expenses: 38000, profit: 17000 },
    { month: 'Mar', revenue: 60000, expenses: 40000, profit: 20000 },
    { month: 'Apr', revenue: 65000, expenses: 42000, profit: 23000 },
    { month: 'May', revenue: 70000, expenses: 45000, profit: 25000 },
    { month: 'Jun', revenue: 75000, expenses: 48000, profit: 27000 },
    { month: 'Jul', revenue: 80000, expenses: 50000, profit: 30000 },
    { month: 'Aug', revenue: 85000, expenses: 52000, profit: 33000 },
    { month: 'Sep', revenue: 90000, expenses: 55000, profit: 35000 },
    { month: 'Oct', revenue: 95000, expenses: 58000, profit: 37000 },
    { month: 'Nov', revenue: 100000, expenses: 60000, profit: 40000 },
    { month: 'Dec', revenue: 105000, expenses: 62000, profit: 43000 }
  ];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-300">Loading annual report data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Annual Report</h1>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <span className="text-sm text-gray-600">Comprehensive Financial Overview</span>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex justify-end mb-8 space-x-3">
        <button
          className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow"
          onClick={handleExportPDF}
        >
          <Download className="w-5 h-5" />
          <span>Export PDF</span>
        </button>
        <button
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow"
          onClick={handleExportExcel}
        >
          <Download className="w-5 h-5" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Statement Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <StatementTab
            id="overview"
            label="Overview"
            icon={TrendingUp}
            isActive={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <StatementTab
            id="financials"
            label="Financials"
            icon={DollarSign}
            isActive={activeTab === 'financials'}
            onClick={() => setActiveTab('financials')}
          />
          <StatementTab
            id="analysis"
            label="Analysis"
            icon={Calculator}
            isActive={activeTab === 'analysis'}
            onClick={() => setActiveTab('analysis')}
          />
          <StatementTab
            id="charts"
            label="Charts"
            icon={FileText}
            isActive={activeTab === 'charts'}
            onClick={() => setActiveTab('charts')}
          />
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {activeTab === 'overview' && 'Annual Report Overview'}
              {activeTab === 'financials' && 'Financial Statements'}
              {activeTab === 'analysis' && 'Financial Analysis'}
              {activeTab === 'charts' && 'Performance Charts'}
            </h3>
            <p className="text-sm text-gray-600">
              Financial Year: {companyInfo.financialYear}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
              onClick={generateAnnualReport}
              disabled={isGenerating}
            >
              <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Generating...' : 'Generate Report'}</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Company Information */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-900 mb-4">Company Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="font-medium">{companyInfo.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">{companyInfo.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">City</p>
                  <p className="font-medium">{companyInfo.city}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Country</p>
                  <p className="font-medium">{companyInfo.country}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Established</p>
                  <p className="font-medium">{companyInfo.establishedDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Financial Year</p>
                  <p className="font-medium">{companyInfo.financialYear}</p>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h4>
              <p className="text-gray-700 leading-relaxed">
                This annual report presents a comprehensive overview of {companyInfo.name}'s financial performance 
                and position for the year ended {companyInfo.financialYear}. The company has demonstrated strong 
                financial resilience and strategic growth throughout the reporting period.
              </p>
            </div>

            {/* Key Highlights */}
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h4 className="text-lg font-semibold text-green-900 mb-4">Key Highlights</h4>
              <ul className="space-y-2 text-gray-700">
                <li>• Strong financial performance throughout the year</li>
                <li>• Strategic investments in business growth</li>
                <li>• Enhanced operational efficiency</li>
                <li>• Market expansion initiatives</li>
                <li>• Commitment to sustainable business practices</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="space-y-6">
            {/* Financial Highlights */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Highlights</h4>
              {financialData?.profitLoss && financialData.profitLoss.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-left">Key Metrics</th>
                        <th className="py-3 px-4 border border-gray-300 font-semibold text-gray-900 text-right">Amount (€)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 border border-gray-300 font-medium">Total Revenue</td>
                        <td className="py-3 px-4 border border-gray-300 text-right font-medium">
                          €{financialData.profitLoss.filter(i => i.type === 'revenue').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 border border-gray-300 font-medium">Total Expenses</td>
                        <td className="py-3 px-4 border border-gray-300 text-right font-medium">
                          €{financialData.profitLoss.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-3 px-4 border border-gray-300 font-semibold">Net Profit/Loss</td>
                        <td className="py-3 px-4 border border-gray-300 text-right font-semibold">
                          €{financialData.profitLoss.reduce((sum, i) => sum + (i.type === 'revenue' ? i.amount : -i.amount), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  No financial data available. Generate statements to view data.
                </div>
              )}
            </div>

            {/* Balance Sheet Summary */}
            {financialData?.balanceSheet && financialData.balanceSheet.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-blue-700 mb-4">Assets</h4>
                  <div className="space-y-2">
                    {financialData.balanceSheet
                      .filter(item => item.type === 'asset')
                      .map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-700">{item.account}</span>
                          <span className="font-medium">€{item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-red-700 mb-4">Liabilities & Equity</h4>
                  <div className="space-y-2">
                    {financialData.balanceSheet
                      .filter(item => item.type === 'liability' || item.type === 'equity')
                      .map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-700">{item.account}</span>
                          <span className="font-medium">€{item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {/* Management Discussion */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Management Discussion & Analysis</h4>
              <p className="text-gray-700 leading-relaxed mb-4">
                The management team of {companyInfo.name} is pleased to present this annual report for the 
                financial year {companyInfo.financialYear}. The company has maintained its commitment to 
                operational excellence and strategic growth while navigating the dynamic business environment.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Throughout the year, we have focused on strengthening our market position, optimizing 
                operational efficiency, and investing in future growth opportunities. Our financial 
                performance reflects the success of these strategic initiatives.
              </p>
            </div>

            {/* Risk Analysis */}
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <h4 className="text-lg font-semibold text-yellow-900 mb-4">Risk Analysis</h4>
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-yellow-800">Market Risks</h5>
                  <p className="text-yellow-700 text-sm">Economic fluctuations and competitive pressures</p>
                </div>
                <div>
                  <h5 className="font-medium text-yellow-800">Operational Risks</h5>
                  <p className="text-yellow-700 text-sm">Supply chain disruptions and technology changes</p>
                </div>
                <div>
                  <h5 className="font-medium text-yellow-800">Financial Risks</h5>
                  <p className="text-yellow-700 text-sm">Interest rate changes and currency fluctuations</p>
                </div>
              </div>
            </div>

            {/* Future Outlook */}
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h4 className="text-lg font-semibold text-green-900 mb-4">Future Outlook</h4>
              <p className="text-green-700 leading-relaxed">
                Looking forward, {companyInfo.name} is positioned for continued growth and success. 
                The company will focus on expanding market presence, enhancing operational efficiency, 
                and maintaining strong financial discipline. We remain committed to delivering value 
                to our stakeholders while pursuing sustainable growth opportunities.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-6">
            {/* Revenue vs Expenses Chart */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sampleData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profit Trend Chart */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Profit Trend</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sampleData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Bar dataKey="profit" fill="#10b981" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnualReport;
