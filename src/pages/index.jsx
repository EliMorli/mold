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

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

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
                
                    <Route path="/" element={<Automation />} />
                
                
                <Route path="/Automation" element={<Automation />} />
                
                <Route path="/Calendar" element={<Calendar />} />
                
                <Route path="/ClientPortal" element={<ClientPortal />} />
                
                <Route path="/ClientProfile" element={<ClientProfile />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/Communications" element={<Communications />} />
                
                <Route path="/CustomReports" element={<CustomReports />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Documents" element={<Documents />} />
                
                <Route path="/Expenses" element={<Expenses />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Invoices" element={<Invoices />} />
                
                <Route path="/Labs" element={<Labs />} />
                
                <Route path="/Map" element={<Map />} />
                
                <Route path="/OwnerView" element={<OwnerView />} />
                
                <Route path="/Payments" element={<Payments />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/TechnicianProfile" element={<TechnicianProfile />} />
                
                <Route path="/Technicians" element={<Technicians />} />
                
                <Route path="/TestProfile" element={<TestProfile />} />
                
                <Route path="/Tests" element={<Tests />} />
                
                <Route path="/TechnicianPerformance" element={<TechnicianPerformance />} />
                
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