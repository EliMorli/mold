import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/useAuth';
import Layout from './Layout.jsx';

import Automation from './Automation';
import Calendar from './Calendar';
import ClientPortal from './ClientPortal';
import ClientProfile from './ClientProfile';
import Clients from './Clients';
import Communications from './Communications';
import CustomReports from './CustomReports';
import Dashboard from './Dashboard';
import Documents from './Documents';
import Expenses from './Expenses';
import Home from './Home';
import Invoices from './Invoices';
import Labs from './Labs';
import Map from './Map';
import OwnerView from './OwnerView';
import Payments from './Payments';
import Reports from './Reports';
import Settings from './Settings';
import TechnicianProfile from './TechnicianProfile';
import Technicians from './Technicians';
import TestProfile from './TestProfile';
import Tests from './Tests';
import TechnicianPerformance from './TechnicianPerformance';
import Users from './Users';
import Verify from './Verify';

const PAGES = {
  Automation,
  Calendar,
  ClientPortal,
  ClientProfile,
  Clients,
  Communications,
  CustomReports,
  Dashboard,
  Documents,
  Expenses,
  Home,
  Invoices,
  Labs,
  Map,
  OwnerView,
  Payments,
  Reports,
  Settings,
  TechnicianProfile,
  Technicians,
  TestProfile,
  Tests,
  TechnicianPerformance,
  Users,
};

function getCurrentPage(url) {
  const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  let urlLastPart = normalizedUrl.split('/').pop() || '';
  if (urlLastPart.includes('?')) {
    urlLastPart = urlLastPart.split('?')[0];
  }
  return Object.keys(PAGES).find((page) => page.toLowerCase() === urlLastPart.toLowerCase()) || 'Dashboard';
}

function ProtectedRoutes() {
  const location = useLocation();
  const currentPage = getCurrentPage(location.pathname);
  const { user, isLoading, isApprovedUser } = useAuth();

  if (isLoading) return null;

  if (!user || !isApprovedUser) {
    return <Navigate to="/verify" replace />;
  }

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/clientportal" element={<ClientPortal />} />
        <Route path="/clientprofile" element={<ClientProfile />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/communications" element={<Communications />} />
        <Route path="/customreports" element={<CustomReports />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/home" element={<Home />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/labs" element={<Labs />} />
        <Route path="/map" element={<Map />} />
        <Route path="/ownerview" element={<OwnerView />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/technicianprofile" element={<TechnicianProfile />} />
        <Route path="/technicians" element={<Technicians />} />
        <Route path="/testprofile" element={<TestProfile />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/technicianperformance" element={<TechnicianPerformance />} />
        <Route path="/users" element={<Users />} />
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <Routes>
        <Route path="/verify" element={<Verify />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </Router>
  );
}
