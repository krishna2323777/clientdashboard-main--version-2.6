import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HiOutlineDocumentText, HiIdentification, HiMenu, HiOutlineViewGrid, HiChevronDown } from "react-icons/hi";
import { AiOutlineCalendar } from "react-icons/ai";
import { MdSpaceDashboard } from "react-icons/md";
import { MdViewSidebar } from 'react-icons/md';
import { FaBuilding, FaChartPie, FaFileInvoiceDollar, FaHeadset } from "react-icons/fa";
import { FiSettings } from "react-icons/fi";
import { PiCertificate } from "react-icons/pi";
import { Handshake, FileSignature, ClipboardList, Star, Globe, Percent, Database, BookOpen, Bot, FolderOpen, Home, Users, Layers, Mail } from "lucide-react";
import { FaBuildingUser } from "react-icons/fa6";
import { BiData } from "react-icons/bi";
import SupportButton from './SupportButton';
import Header from './Header';
import { supabase } from './SupabaseClient';
import './Sidebar.css';

const Sidebar = ({ onToggle }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [navOpen, setNavOpen] = useState(true);
  const [entityOpen, setEntityOpen] = useState(true);
  const [knowledgeOpen, setKnowledgeOpen] = useState(true);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    if (onToggle) {
      onToggle(newCollapsedState);
    }
  };

  useEffect(() => {
    if (onToggle) {
      onToggle(collapsed);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
      }
    };
    getUserEmail();
  }, []);

  const isLead = localStorage.getItem('userRole') === 'lead';
  const allowedPaths = ['/dashboard', '/settings', '/services', '/generate-forms','/discover'];
  const handleRestrictedItemClick = (e) => {
    if (isLead) {
      e.preventDefault();
      navigate('/subscription-required');
    }
  };

  const handleComingSoonClick = (e) => {
    e.preventDefault();
    alert('Coming Soon! This feature is under development.');
  };

  // Helper for badge
  const Badge = ({ count }) => (
    <span className="sidebar-badge">{count}</span>
  );

  // Custom Sidebar Icon SVG
  const SidebarIcon = () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        ry="2"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />
      <line
        x1="8"
        y1="3"
        x2="8"
        y2="21"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );

  return (
    <>
      <Header 
        userEmail={userEmail}
        onMenuToggle={toggleMobileMenu}
        isMenuOpen={isOpen}
      />
      {isMobile && (
        <div className={`sidebar-backdrop ${isOpen ? 'active' : ''}`} onClick={toggleMobileMenu}></div>
      )}
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${isMobile ? (isOpen ? 'mobile-open' : 'mobile-closed') : ''}`}>
        <div className="sidebar-toggle top-toggle" onClick={toggleSidebar}>
          <SidebarIcon />
        </div>
        <nav className="sidebar-nav">
          {/* NAVIGATION */}
          {!collapsed && (
            <div className="sidebar-section-title" onClick={() => setNavOpen(v => !v)} style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
              <span style={{flex: 1}}>NAVIGATION</span>
              <HiChevronDown size={18} color="white" style={{ transform: navOpen ? 'rotate(0deg)' : 'rotate(-180deg)', transition: 'transform 0.2s' }} />
            </div>
          )}
          {navOpen && (
            <ul>
              <li>
                <NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                  <span className="icon"><Home size={18} /></span>
                  {!collapsed && <span className="label">Home</span>}
                </NavLink>
              </li>
              
              <li>
                <NavLink to="/mailbox" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                  <span className="icon"><Mail size={18} /></span>
                  {!collapsed && <span className="label">Inbox</span>}
                </NavLink>
              </li>
    
              <li>
                <NavLink to="/dataroom" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                  <span className="icon"><Database size={18} /></span>
                  {!collapsed && <span className="label">Data Center</span>}
                </NavLink>
              </li>
            </ul>
          )}
          {/* ENTITY MANAGEMENT */}
          {!collapsed && (
            <div className="sidebar-section-title" onClick={() => setEntityOpen(v => !v)} style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
              <span style={{flex: 1}}>ENTITY MANAGEMENT</span>
              <HiChevronDown size={18} color="white" style={{ transform: entityOpen ? 'rotate(0deg)' : 'rotate(-180deg)', transition: 'transform 0.2s' }} />
            </div>
          )}
          {entityOpen && (
            <ul>
            
              <li>
                <NavLink to="/corporate-hub" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                  <span className="icon"><FaBuildingUser size={18} /></span>
                  {!collapsed && <span className="label">Corporate Hub</span>}
                </NavLink>
              </li>
              <li>
                <NavLink to="/financial-hub" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                  <span className="icon"><FaChartPie size={18} /></span>
                  {!collapsed && <span className="label">Financial Hub</span>}
                </NavLink>
              </li>
              <li>
                <NavLink to="/comprehensive-tax-dashboard" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                  <span className="icon"><Percent size={18} /></span>
                  {!collapsed && <span className="label">Tax Hub</span>}
                </NavLink>
              </li>
             
            </ul>
          )}
          {/* KNOWLEDGE BASE */}
          {!collapsed && (
            <div className="sidebar-section-title" onClick={() => setKnowledgeOpen(v => !v)} style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
              <span style={{flex: 1}}>KNOWLEDGE BASE</span>
              <HiChevronDown size={18} color="white" style={{ transform: knowledgeOpen ? 'rotate(0deg)' : 'rotate(-180deg)', transition: 'transform 0.2s' }} />
            </div>
          )}
          {knowledgeOpen && (
            <ul>
              <li>
                <NavLink to="/discover" className={({isActive}) => isActive ? 'active' : ''} onClick={handleNavClick}>
                  <span className="icon"><BookOpen size={18} /></span>
                  {!collapsed && <span className="label">Discover</span>}
                </NavLink>
              </li>
              <li>
                <NavLink to="/library" className={({isActive}) => isActive ? 'active' : ''} onClick={handleComingSoonClick}>
                  <span className="icon"><FolderOpen size={18} /></span>
                  {!collapsed && <span className="label">Library</span>}
                </NavLink>
              </li>
              <li>
                <NavLink to="/ai-assistant" className={({isActive}) => isActive ? 'active' : ''} onClick={handleComingSoonClick}>
                  <span className="icon"><Bot size={18} /></span>
                  {!collapsed && <span className="label">AI Assistant</span>}
                </NavLink>
              </li>
            </ul>
          )}
        </nav>
        <div className="support-item">
          <SupportButton collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
