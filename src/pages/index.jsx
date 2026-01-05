import Layout from "./Layout.jsx";

import Automation from "./Automation";

import Calendar from "./Calendar";

import ClientPortal from "./ClientPortal";

import ClientProfile from "./ClientProfile";

import Clients from "./Clients";

import Communications from "./Communications";

import CustomReports from "./CustomReports";

import Dashboard from "./Dashboard";

import Documents from "./Documents";

import Expenses from "./Expenses";

import Home from "./Home";

import Invoices from "./Invoices";

import Labs from "./Labs";

import Login from "./Login";

import Map from "./Map";

import OwnerView from "./OwnerView";

import Payments from "./Payments";

import Reports from "./Reports";

import Settings from "./Settings";

import TechnicianProfile from "./TechnicianProfile";

import Technicians from "./Technicians";

import TestProfile from "./TestProfile";

import Tests from "./Tests";

import TechnicianPerformance from "./TechnicianPerformance";

import UserManagement from "./UserManagement";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';

import { useAuth } from "@/components/useAuth";

const PAGES = {

    Automation: Automation,

    Calendar: Calendar,

    ClientPortal: ClientPortal,

    ClientProfile: ClientProfile,

    Clients: Clients,

    Communications: Communications,

    CustomReports: CustomReports,

    Dashboard: Dashboard,

    Documents: Documents,

    Expenses: Expenses,

    Home: Home,

    Invoices: Invoices,

    Labs: Labs,

    Login: Login,

    Map: Map,

    OwnerView: OwnerView,

    Payments: Payments,

    Reports: Reports,

    Settings: Settings,

    TechnicianProfile: TechnicianProfile,

    Technicians: Technicians,

    TestProfile: TestProfile,

    Tests: Tests,

    TechnicianPerformance: TechnicianPerformance,

    UserManagement: UserManagement,

}

// Protected route wrapper
function ProtectedRoute({ children }) {
    const { isLoggedIn, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F5F3FF] via-[#F0F9FF] to-[#FFF7ED] flex items-center justify-center">
                <div className="text-purple-600">Loading...</div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    const { isLoggedIn, isLoading } = useAuth();

    // Show login page without layout
    if (location.pathname === '/login') {
        return (
            <Routes>
                <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <Login />} />
            </Routes>
        );
    }

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F5F3FF] via-[#F0F9FF] to-[#FFF7ED] flex items-center justify-center">
                <div className="text-purple-600">Loading...</div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
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

                <Route path="/usermanagement" element={<UserManagement />} />

            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}