import { base44, DEMO_MODE } from './base44Client';

// Demo data for testing
const DEMO_TESTS = [
  { id: '1', test_number: 'TEST-001', test_category: 'Initial', status: 'Scheduled', client_name: 'John Smith', property_address: '123 Main St, Miami FL', scheduled_date: new Date().toISOString(), technician_name: 'Mike Tech' },
  { id: '2', test_number: 'TEST-002', test_category: 'Clearance', status: 'In Progress', client_name: 'Sarah Johnson', property_address: '456 Oak Ave, Tampa FL', scheduled_date: new Date().toISOString(), technician_name: 'Lisa Tech' },
  { id: '3', test_number: 'TEST-003', test_category: 'Initial', status: 'Completed', client_name: 'Bob Williams', property_address: '789 Pine Rd, Orlando FL', scheduled_date: new Date().toISOString(), technician_name: 'Mike Tech' },
];

const DEMO_CLIENTS = [
  { id: '1', name: 'John Smith', email: 'john@example.com', phone: '555-0101', client_type: 'Homeowner', address: '123 Main St, Miami FL' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0102', client_type: 'Business', address: '456 Oak Ave, Tampa FL' },
  { id: '3', name: 'Bob Williams', email: 'bob@example.com', phone: '555-0103', client_type: 'Homeowner', address: '789 Pine Rd, Orlando FL' },
];

const DEMO_TECHNICIANS = [
  { id: '1', name: 'Mike Tech', email: 'mike@example.com', phone: '555-0201', status: 'Active', color_code: 'Blue', permission_level: 'Technician', completed_tests: 25, rating: 4.8 },
  { id: '2', name: 'Lisa Tech', email: 'lisa@example.com', phone: '555-0202', status: 'Active', color_code: 'Pink', permission_level: 'Technician', completed_tests: 18, rating: 4.9 },
];

const DEMO_LABS = [
  { id: '1', name: 'ABC Labs', email: 'contact@abclabs.com', phone: '555-0301', address: '100 Lab Way, Miami FL' },
];

const DEMO_INVOICES = [
  { id: '1', invoice_number: 'INV-001', client_name: 'John Smith', total: 500, status: 'Paid', paid_date: new Date().toISOString() },
  { id: '2', invoice_number: 'INV-002', client_name: 'Sarah Johnson', total: 750, status: 'Sent', due_date: new Date().toISOString() },
];

const DEMO_EXPENSES = [
  { id: '1', description: 'Lab Fee', category: 'Lab Fees', amount: 150, date: new Date().toISOString(), vendor: 'ABC Labs' },
  { id: '2', description: 'Gas', category: 'Travel', amount: 50, date: new Date().toISOString(), vendor: 'Shell' },
];

// Create mock entity wrapper
const createMockEntity = (demoData) => ({
  list: () => Promise.resolve(demoData),
  get: (id) => Promise.resolve(demoData.find(item => item.id === id)),
  create: (data) => Promise.resolve({ id: Date.now().toString(), ...data }),
  update: (id, data) => Promise.resolve({ id, ...data }),
  delete: (id) => Promise.resolve({ success: true }),
});

export const Test = DEMO_MODE ? createMockEntity(DEMO_TESTS) : base44.entities.Test;
export const Client = DEMO_MODE ? createMockEntity(DEMO_CLIENTS) : base44.entities.Client;
export const Technician = DEMO_MODE ? createMockEntity(DEMO_TECHNICIANS) : base44.entities.Technician;
export const Lab = DEMO_MODE ? createMockEntity(DEMO_LABS) : base44.entities.Lab;
export const Invoice = DEMO_MODE ? createMockEntity(DEMO_INVOICES) : base44.entities.Invoice;
export const Expense = DEMO_MODE ? createMockEntity(DEMO_EXPENSES) : base44.entities.Expense;
export const Payment = DEMO_MODE ? createMockEntity([]) : base44.entities.Payment;
export const Document = DEMO_MODE ? createMockEntity([]) : base44.entities.Document;
export const Message = DEMO_MODE ? createMockEntity([]) : base44.entities.Message;
export const AppSettings = DEMO_MODE ? createMockEntity([]) : base44.entities.AppSettings;
export const User = DEMO_MODE ? base44.entities.User : base44.entities.User;