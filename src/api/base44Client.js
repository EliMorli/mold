import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Demo mode - set to true to bypass Base44 authentication
export const DEMO_MODE = true;

// Demo data for testing
const DEMO_TESTS = [
  { id: '1', test_number: 'TEST-001', test_category: 'Initial', status: 'Scheduled', client_name: 'John Smith', property_address: '123 Main St, Miami FL', scheduled_date: new Date().toISOString(), technician_name: 'Mike Tech', technician_id: '1' },
  { id: '2', test_number: 'TEST-002', test_category: 'Clearance', status: 'In Progress', client_name: 'Sarah Johnson', property_address: '456 Oak Ave, Tampa FL', scheduled_date: new Date().toISOString(), technician_name: 'Lisa Tech', technician_id: '2' },
  { id: '3', test_number: 'TEST-003', test_category: 'Initial', status: 'Completed', client_name: 'Bob Williams', property_address: '789 Pine Rd, Orlando FL', scheduled_date: new Date().toISOString(), technician_name: 'Mike Tech', technician_id: '1', completed_date: new Date().toISOString() },
  { id: '4', test_number: 'TEST-004', test_category: 'Clearance', status: 'Lab Analysis', client_name: 'Alice Brown', property_address: '321 Elm St, Jacksonville FL', scheduled_date: new Date().toISOString(), technician_name: 'Lisa Tech', technician_id: '2' },
];

const DEMO_CLIENTS = [
  { id: '1', name: 'John Smith', email: 'john@example.com', phone: '555-0101', client_type: 'Homeowner', address: '123 Main St, Miami FL' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0102', client_type: 'Business', address: '456 Oak Ave, Tampa FL' },
  { id: '3', name: 'Bob Williams', email: 'bob@example.com', phone: '555-0103', client_type: 'Homeowner', address: '789 Pine Rd, Orlando FL' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', phone: '555-0104', client_type: 'Property Manager', address: '321 Elm St, Jacksonville FL' },
];

const DEMO_TECHNICIANS = [
  { id: '1', name: 'Mike Tech', email: 'mike@example.com', phone: '555-0201', status: 'Active', color_code: 'Blue', permission_level: 'Technician', completed_tests: 25, rating: 4.8, can_be_assigned_jobs: true },
  { id: '2', name: 'Lisa Tech', email: 'lisa@example.com', phone: '555-0202', status: 'Active', color_code: 'Pink', permission_level: 'Technician', completed_tests: 18, rating: 4.9, can_be_assigned_jobs: true },
];

const DEMO_LABS = [
  { id: '1', name: 'ABC Labs', email: 'contact@abclabs.com', phone: '555-0301', address: '100 Lab Way, Miami FL', status: 'Active' },
];

const DEMO_INVOICES = [
  { id: '1', invoice_number: 'INV-001', client_name: 'John Smith', total: 500, status: 'Paid', paid_date: new Date().toISOString(), created_date: new Date().toISOString() },
  { id: '2', invoice_number: 'INV-002', client_name: 'Sarah Johnson', total: 750, status: 'Sent', due_date: new Date().toISOString(), created_date: new Date().toISOString() },
  { id: '3', invoice_number: 'INV-003', client_name: 'Bob Williams', total: 600, status: 'Paid', paid_date: new Date().toISOString(), created_date: new Date().toISOString() },
];

const DEMO_EXPENSES = [
  { id: '1', description: 'Lab Fee', category: 'Lab Fees', amount: 150, date: new Date().toISOString(), vendor: 'ABC Labs' },
  { id: '2', description: 'Gas', category: 'Travel', amount: 50, date: new Date().toISOString(), vendor: 'Shell' },
  { id: '3', description: 'Equipment', category: 'Equipment', amount: 200, date: new Date().toISOString(), vendor: 'Home Depot' },
];

// Create mock entity wrapper
const createMockEntity = (demoData) => ({
  list: () => Promise.resolve([...demoData]),
  get: (id) => Promise.resolve(demoData.find(item => item.id === id)),
  create: (data) => Promise.resolve({ id: Date.now().toString(), ...data }),
  update: (id, data) => Promise.resolve({ id, ...data }),
  delete: (id) => Promise.resolve({ success: true }),
});

// Create the real client
const realClient = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID || "68fe9e0ba7e63fa3c343bbd2",
  requiresAuth: !DEMO_MODE
});

// Mock client for demo mode
const mockClient = {
  entities: {
    Test: createMockEntity(DEMO_TESTS),
    Client: createMockEntity(DEMO_CLIENTS),
    Technician: createMockEntity(DEMO_TECHNICIANS),
    Lab: createMockEntity(DEMO_LABS),
    Invoice: createMockEntity(DEMO_INVOICES),
    Expense: createMockEntity(DEMO_EXPENSES),
    Payment: createMockEntity([]),
    Document: createMockEntity([]),
    Message: createMockEntity([]),
    AppSettings: createMockEntity([]),
  },
  auth: {
    me: () => Promise.resolve({ id: 'demo', full_name: 'Demo Admin', email: 'demo@example.com', app_role: 'Admin' }),
    logout: () => { window.location.href = '/'; },
  },
};

// Export the appropriate client based on demo mode
export const base44 = DEMO_MODE ? mockClient : realClient;
