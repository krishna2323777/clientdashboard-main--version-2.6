import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import  Dashboard  from './components/Dashboard';
import KYC from './components/KYCDocuments';
import FinancialDocuments from './components/FinancialDocuments';
import UserProfileForm from './components/UserProfileForm';
import UserProfileView from './components/UserProfileView';
import Layout from './components/Layout';
import Mailbox from './components/Mailbox';
import KVKRegistrationSidebar from './components/KVKRegistrationSidebar';
import Form13 from './components/Form13';
import Form11 from './components/Form11';
import FormSelection from './components/FormSelection';
import TaxPageWithTasks from './components/TaxPageWithTasks';
import Tax from './components/Tax';
import VATanalysis from './components/VATanalysis';
import AIDocumentAnalyzer from './pages/AIDocumentAnalyzer';
import FinancialOverview from './components/FinancialOverview';
import GenerateForms from './components/GenerateForms';
import Services from './components/Services';
import Certificate from './components/Certificate';
import Calendar from './components/Calendar';
import Settings from './components/Settings';
import KVKRegistrationForm from './components/KVKRegistrationForm';
import Applications from './components/Applications';
import Agreements from './components/Agreements';
import CorporateChanges from './components/CorporateChanges';
import AgreementGenerator from './components/AgreementGenerator';
import { supabase } from './components/SupabaseClient';
import Payment from './components/Payment';
import Form9 from './components/Form9';
import Registration from './components/registration';
import VAT from './components/VAT';
import DutchBranchRegistration from './components/dutchbranchregistration';  // Update import name
import Signup from './components/Signup';
import AuthCallback from './components/AuthCallback';
import AuthMiddleware from './components/AuthMiddleware';
import EbranchDashboard from './components/EbranchDashboard';
import ResetPassword from './components/Resetpassword';
import ProtectedRoute from './components/ProtectedRoute';
import SubscriptionRequired from './components/SubscriptionRequired';
import Discover from './components/Discover';
import CorporateTaxAnalysis from './components/CorporateTaxAnalysis';
import Dataroom from './components/Dataroom';
import FinancialHub from './components/FinancialHub';
import CorporateHub from './components/CorporateHub';
import TargetCompanyDetails from './components/TargetCompanyDetails';
import ComprehensiveTaxDashboard from './components/ComprehensiveTaxDashboard';
import CorporateIncomeTax from './components/CorporateIncomeTax';
import Invoices from './components/Invoices';
import BranchRegistrationRequirements from './components/BranchRegistrationRequirements';
import VatRequirement from './components/VatRequirement';
import FinancialData from './components/FinancialData';


function App() { 
  

  return (
    <Router>
      <div className="App">
        <div className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Layout wraps all authenticated routes */}
            <Route element={<Layout />}>
              {/* Subscription required page (with sidebar and header) */}
              <Route path="/subscription-required" element={<SubscriptionRequired />} />
              
              {/* Apply route protection with AuthMiddleware */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AuthMiddleware />}>
                  {/* All your app routes here */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/financial-hub" element={<FinancialHub />} />
                  <Route path="/corporate-hub" element={<CorporateHub />} />
                  <Route path="/ebranch" element={<EbranchDashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/generate-forms" element={<GenerateForms />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/dataroom" element={<Dataroom />} />
                  <Route path="/corporate-income-tax" element={<CorporateIncomeTax />} />
                  <Route path="/Tax" element={<Tax />} />
                  <Route path="/comprehensive-tax-dashboard" element={<ComprehensiveTaxDashboard />} />
                  <Route path="/vat-analysis" element={<VATanalysis />} />
                  <Route path="/mailbox" element={<Mailbox />} />
                  <Route path="/ai-analyzer" element={<AIDocumentAnalyzer />} />
                  {/* All other routes that require subscription for leads */}
                  <Route path="/payment" element={<Payment />} />
                  <Route path="/documents/*" element={<KYC />} />
                  <Route path="/documents/financial" element={<FinancialDocuments />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/documents/certificate" element={<Certificate />} />
                  <Route path="/financial-overview" element={<FinancialOverview />} />
                  <Route path="/kvk-registration" element={<KVKRegistrationForm />} />
                  <Route path="/form-13" element={<Form13 />} />
                  <Route path="/form-11" element={<Form11 />} />
                  <Route path="/form-selection" element={<FormSelection />} />
                  <Route path="/registration" element={<Registration />} />
                  <Route path="/vat" element={<VAT />} />
                  
                  <Route path="/dutch-branch-registration" element={<DutchBranchRegistration />} />
                  <Route path="/branch-registration" element={<BranchRegistrationRequirements />} />
                  <Route path="/kvk-registration/sidebar" element={<KVKRegistrationSidebar />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/applications/new" element={<Applications />} />
                  <Route path="/applications/start" element={<Applications />} />
                  <Route path="/form-9" element={<Form9 />} />
                  <Route path="/agreements" element={<Agreements />} />
                  <Route path="/agreements/generate/:id" element={<AgreementGenerator />} />
                  <Route path="/agreements/custom" element={<Agreements />} />
                  <Route path="/agreements/view/:id" element={<Agreements />} />
                  <Route path="/corporate-changes" element={<CorporateChanges />} />
                  <Route path="/corporate-changes/:processType" element={<CorporateChanges />} />
                  <Route path="/profile" element={<UserProfileView />} />
                  <Route path="/profile/edit" element={<UserProfileForm />} />
                  <Route path="/corporate-tax-analysis" element={<CorporateTaxAnalysis />} />
                  <Route path="/target-company/:id" element={<TargetCompanyDetails />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/vat-requirement" element={<VatRequirement />} />
                  <Route path="/financial-data" element={<FinancialData />} />
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
      
    </Router>
  );
}

export default App;
