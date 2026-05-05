import Layout from "./Layout.jsx";

import Automation from "./Automation";

import Calendar from "./Calendar";

import ClientPortal from "./ClientPortal";

import ClientProfile from "./ClientProfile";

import Clients from "./Clients";

import Communications from "./Communications";

import CustomReports from "./CustomReports";

import Dashboard from "./Dashboard";

import DailyKPIs from "./DailyKPIs";

import DailyJobView from "./DailyJobView";

import Documents from "./Documents";

import Expenses from "./Expenses";

import Home from "./Home";

import Invoices from "./Invoices";

import Labs from "./Labs";

import LeadTracking from "./LeadTracking";

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

import Users from "./Users";

import Verify from "./Verify";

import AccessCodes from "./AccessCodes";

import Login from "./auth/Login";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {

    Automation: Automation,

    Calendar: Calendar,

    ClientPortal: ClientPortal,

    ClientProfile: ClientProfile,

    Clients: Clients,

    Communications: Communications,

    CustomReports: CustomReports,

    DailyKPIs: DailyKPIs,

    DailyJobView: DailyJobView,

    Dashboard: Dashboard,

    Documents: Documents,

    Expenses: Expenses,

    Home: Home,

    Invoices: Invoices,

    Labs: Labs,

    LeadTracking: LeadTracking,

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

    Users: Users,

    AccessCodes: AccessCodes,

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

                <Route path="/dailykpis" element={<DailyKPIs />} />

                <Route path="/dailyjobview" element={<DailyJobView />} />

                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/documents" element={<Documents />} />

                <Route path="/expenses" element={<Expenses />} />

                <Route path="/home" element={<Home />} />

                <Route path="/invoices" element={<Invoices />} />

                <Route path="/labs" element={<Labs />} />

                <Route path="/leadtracking" element={<LeadTracking />} />

                <Route path="/map" element={<Map />} />

                <Route path="/ownerview" element={<OwnerView />} />

                <Route path="/payments" element={<Payments />} />

                <Route path="/reports" element={<Reports />} />

                <Route path="/settings" element={<Settings />} />

                <Route path="/settings/access-codes" element={<AccessCodes />} />

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
                {/* Public auth page — no layout, no auth gate */}
                <Route path="/auth/login" element={<Login />} />

                {/* Verify page without layout */}
                <Route path="/verify" element={<Verify />} />

                {/* All other pages with layout — gated on auth */}
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <PagesContent />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
}
