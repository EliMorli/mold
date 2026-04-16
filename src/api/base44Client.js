import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Demo mode - set to true to bypass Base44 authentication
export const DEMO_MODE = true;

// Version for demo data - increment this to force refresh localStorage
const DEMO_DATA_VERSION = 11;

// Helper to create dates relative to today
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

// Demo data for testing (used as initial data if localStorage is empty)
const INITIAL_CLIENTS = [
  { id: '1', name: 'Rodriguez Property Management', email: 'carlos@rodriguezpm.com', phone: '305-555-0101', client_type: 'Property Manager', address: '1200 Brickell Ave, Miami FL 33131', sales_rep_name: 'Maria Santos', sales_rep_phone: '305-555-0150' },
  { id: '2', name: 'Sunshine Realty Group', email: 'info@sunshinerealty.com', phone: '813-555-0102', client_type: 'Business', address: '2901 W Kennedy Blvd, Tampa FL 33609', sales_rep_name: 'Tom Bradley', sales_rep_phone: '813-555-0151' },
  { id: '3', name: 'James & Patricia Wilson', email: 'jwilson@gmail.com', phone: '407-555-0103', client_type: 'Homeowner', address: '4521 Lake Underhill Rd, Orlando FL 32807' },
  { id: '4', name: 'Atlantic Coast Insurance', email: 'claims@atlanticcoast.com', phone: '904-555-0104', client_type: 'Insurance Company', address: '100 N Laura St, Jacksonville FL 32202', sales_rep_name: 'Jennifer Adams', sales_rep_phone: '904-555-0152' },
  { id: '5', name: 'Michael Thompson', email: 'mthompson@yahoo.com', phone: '954-555-0105', client_type: 'Homeowner', address: '3300 NE 36th St, Fort Lauderdale FL 33308' },
  { id: '6', name: 'Coastal Living Condos HOA', email: 'manager@coastalliving.com', phone: '561-555-0106', client_type: 'HOA', address: '500 S Ocean Blvd, Boca Raton FL 33432', sales_rep_name: 'David Chen', sales_rep_phone: '561-555-0153' },
  { id: '7', name: 'First National Bank - Facilities', email: 'facilities@fnb.com', phone: '305-555-0107', client_type: 'Business', address: '1 SE 3rd Ave, Miami FL 33131' },
  { id: '8', name: 'The Martinez Family', email: 'roberto.martinez@outlook.com', phone: '786-555-0108', client_type: 'Homeowner', address: '8900 SW 152nd St, Miami FL 33157' },
  { id: '9', name: 'Palm Beach School District', email: 'maintenance@pbsd.edu', phone: '561-555-0109', client_type: 'Government', address: '3300 Forest Hill Blvd, West Palm Beach FL 33406' },
  { id: '10', name: 'Evergreen Apartments LLC', email: 'leasing@evergreenfl.com', phone: '727-555-0110', client_type: 'Property Manager', address: '2100 Drew St, Clearwater FL 33765' },
  { id: '11', name: 'Sarah & David Kim', email: 'sarahkim@gmail.com', phone: '407-555-0111', client_type: 'Homeowner', address: '1250 N Orange Ave, Orlando FL 32804' },
  { id: '12', name: 'Beachside Medical Center', email: 'facilities@beachsidemc.com', phone: '239-555-0112', client_type: 'Business', address: '8500 Estero Blvd, Fort Myers Beach FL 33931' },
  { id: '13', name: 'Thompson Construction Co', email: 'john@thompsonconstruction.com', phone: '850-555-0113', client_type: 'Business', address: '4100 W Tennessee St, Tallahassee FL 32304' },
  { id: '14', name: 'Harbor View Rentals', email: 'rentals@harborview.com', phone: '941-555-0114', client_type: 'Property Manager', address: '1500 Main St, Sarasota FL 34236' },
  { id: '15', name: 'The Anderson Family', email: 'mark.anderson@icloud.com', phone: '352-555-0115', client_type: 'Homeowner', address: '2800 NW 43rd St, Gainesville FL 32606' },
];

const INITIAL_TECHNICIANS = [
  { id: '1', name: 'Marcus Johnson', email: 'marcus.j@johnmold.com', phone: '305-555-2001', status: 'Active', color_code: 'Blue', permission_level: 'Senior Technician', completed_tests: 156, rating: 4.9, can_be_assigned_jobs: true, certification: 'ACAC Certified', hire_date: '2021-03-15', home_address: '1500 NW 7th St, Miami FL 33125' },
  { id: '2', name: 'Elena Rodriguez', email: 'elena.r@johnmold.com', phone: '305-555-2002', status: 'Active', color_code: 'Pink', permission_level: 'Technician', completed_tests: 89, rating: 4.8, can_be_assigned_jobs: true, certification: 'IICRC Certified', hire_date: '2022-06-01', home_address: '3200 SW 22nd Ter, Miami FL 33145' },
  { id: '3', name: 'James Cooper', email: 'james.c@johnmold.com', phone: '305-555-2003', status: 'Active', color_code: 'Green', permission_level: 'Technician', completed_tests: 67, rating: 4.7, can_be_assigned_jobs: true, certification: 'ACAC Certified', hire_date: '2022-09-15', home_address: '8500 NW 186th St, Hialeah FL 33015' },
  { id: '4', name: 'Sophia Chen', email: 'sophia.c@johnmold.com', phone: '305-555-2004', status: 'Active', color_code: 'Purple', permission_level: 'Junior Technician', completed_tests: 34, rating: 4.6, can_be_assigned_jobs: true, certification: 'In Training', hire_date: '2023-08-01', home_address: '500 Brickell Key Dr, Miami FL 33131' },
  { id: '5', name: 'David Williams', email: 'david.w@johnmold.com', phone: '305-555-2005', status: 'On Leave', color_code: 'Orange', permission_level: 'Senior Technician', completed_tests: 201, rating: 4.9, can_be_assigned_jobs: false, certification: 'ACAC & IICRC Certified', hire_date: '2020-01-10', home_address: '2000 S Dixie Hwy, Coral Gables FL 33146' },
];

const INITIAL_LABS = [
  { id: '1', name: 'EMSL Analytical Inc', email: 'florida@emsl.com', phone: '800-220-3675', address: '2901 SW 8th St, Miami FL 33135', status: 'Active', turnaround_days: 3, notes: 'Primary lab - excellent turnaround' },
  { id: '2', name: 'Pro-Lab Diagnostics', email: 'samples@prolab.com', phone: '800-555-3001', address: '1500 NW 49th St, Fort Lauderdale FL 33309', status: 'Active', turnaround_days: 2, notes: 'Rush orders available' },
  { id: '3', name: 'Florida Environmental Labs', email: 'testing@flenviro.com', phone: '407-555-3002', address: '2200 Winter Park Rd, Orlando FL 32803', status: 'Active', turnaround_days: 4, notes: 'Good for bulk samples' },
];

// Demo users for admin-controlled user management
const INITIAL_USERS = [
  { id: '1', email: 'admin@johnmold.com', name: 'John Admin', role: 'Admin', status: 'Verified', verification_code: null, created_date: daysAgo(365) },
  { id: '2', email: 'marcus.j@johnmold.com', name: 'Marcus Johnson', role: 'Technician', status: 'Verified', verification_code: null, created_date: daysAgo(200) },
  { id: '3', email: 'elena.r@johnmold.com', name: 'Elena Rodriguez', role: 'Technician', status: 'Verified', verification_code: null, created_date: daysAgo(150) },
  { id: '4', email: 'james.c@johnmold.com', name: 'James Cooper', role: 'Technician', status: 'Verified', verification_code: null, created_date: daysAgo(120) },
  { id: '5', email: 'newuser@example.com', name: 'Pending User', role: 'Viewer', status: 'Pending', verification_code: '847291', created_date: daysAgo(1) },
];

const INITIAL_TESTS = [
  // Scheduled (upcoming) - with referred_by tracking
  { id: '1', test_number: 'T-2026-001', test_category: 'Initial', status: 'Scheduled', client_id: '1', client_name: 'Rodriguez Property Management', property_address: '1200 Brickell Ave Unit 2305, Miami FL', scheduled_date: daysFromNow(1), technician_id: '1', technician_name: 'Marcus Johnson', test_type: 'Air Quality', number_of_tests: 4, notes: 'Tenant complaint of musty smell', access_instructions: 'Check in with concierge, unit key in lockbox #2305', referred_by: 'Direct', referred_by_company: '' },
  { id: '2', test_number: 'T-2026-002', test_category: 'Clearance', status: 'Scheduled', client_id: '3', client_name: 'James & Patricia Wilson', property_address: '4521 Lake Underhill Rd, Orlando FL', scheduled_date: daysFromNow(2), technician_id: '2', technician_name: 'Elena Rodriguez', test_type: 'Air Quality', number_of_tests: 3, notes: 'Post-remediation clearance test', referred_by: 'All In One Restoration', referred_by_company: 'All In One Restoration' },
  { id: '3', test_number: 'T-2026-003', test_category: 'Initial', status: 'Scheduled', client_id: '6', client_name: 'Coastal Living Condos HOA', property_address: '500 S Ocean Blvd Unit 401, Boca Raton FL', scheduled_date: daysFromNow(3), technician_id: '3', technician_name: 'James Cooper', test_type: 'Full Assessment', number_of_tests: 6, notes: 'Water intrusion from hurricane', referred_by: 'Google', referred_by_company: '' },

  // In Progress
  { id: '4', test_number: 'T-2025-098', test_category: 'Initial', status: 'In Progress', client_id: '2', client_name: 'Sunshine Realty Group', property_address: '2901 W Kennedy Blvd Suite 100, Tampa FL', scheduled_date: daysAgo(0), technician_id: '1', technician_name: 'Marcus Johnson', test_type: 'Air Quality', number_of_tests: 5, samples_collected: 3, referred_by: 'TikTok', referred_by_company: '' },
  { id: '5', test_number: 'T-2025-099', test_category: 'Initial', status: 'In Progress', client_id: '8', client_name: 'The Martinez Family', property_address: '8900 SW 152nd St, Miami FL', scheduled_date: daysAgo(0), technician_id: '4', technician_name: 'Sophia Chen', test_type: 'Surface Swab', number_of_tests: 8, samples_collected: 5, referred_by: 'AMPM Restoration', referred_by_company: 'AMPM Restoration' },

  // Lab Analysis - with lab due date tracking
  { id: '6', test_number: 'T-2025-095', test_category: 'Initial', status: 'Lab Analysis', client_id: '4', client_name: 'Atlantic Coast Insurance', property_address: '100 N Laura St 5th Floor, Jacksonville FL', scheduled_date: daysAgo(3), technician_id: '2', technician_name: 'Elena Rodriguez', test_type: 'Air Quality', number_of_tests: 4, samples_collected: 4, lab_id: '1', lab_name: 'EMSL Analytical Inc', lab_received_date: daysAgo(2), lab_turnaround_hours: 24, lab_due_date: daysAgo(1), referred_by: 'Referral', referred_by_company: 'Atlantic Coast Insurance' },
  { id: '7', test_number: 'T-2025-096', test_category: 'Initial', status: 'Lab Analysis', client_id: '10', client_name: 'Evergreen Apartments LLC', property_address: '2100 Drew St Unit 204, Clearwater FL', scheduled_date: daysAgo(2), technician_id: '3', technician_name: 'James Cooper', test_type: 'Air Quality', number_of_tests: 3, samples_collected: 3, lab_id: '2', lab_name: 'Pro-Lab Diagnostics', lab_received_date: daysAgo(1), lab_turnaround_hours: 24, lab_due_date: daysAgo(0), referred_by: 'Google', referred_by_company: '' },
  { id: '8', test_number: 'T-2025-097', test_category: 'Clearance', status: 'Lab Analysis', client_id: '5', client_name: 'Michael Thompson', property_address: '3300 NE 36th St, Fort Lauderdale FL', scheduled_date: daysAgo(1), technician_id: '1', technician_name: 'Marcus Johnson', test_type: 'Air Quality', number_of_tests: 2, samples_collected: 2, lab_id: '1', lab_name: 'EMSL Analytical Inc', lab_received_date: daysAgo(0), lab_turnaround_hours: 24, lab_due_date: daysFromNow(1), referred_by: 'Website', referred_by_company: '' },

  // Completed (recent) - with recommendation_sent tracking
  { id: '9', test_number: 'T-2025-090', test_category: 'Initial', status: 'Completed', client_id: '7', client_name: 'First National Bank - Facilities', property_address: '1 SE 3rd Ave 12th Floor, Miami FL', scheduled_date: daysAgo(7), completed_date: daysAgo(5), technician_id: '1', technician_name: 'Marcus Johnson', test_type: 'Air Quality', number_of_tests: 6, samples_collected: 6, results: 'Elevated', lab_id: '1', lab_name: 'EMSL Analytical Inc', recommendation_pdf_url: 'https://example.com/report1.pdf', recommendation_sent: true, recommendation_sent_date: daysAgo(4), referred_by: 'Referral', referred_by_company: 'First National Bank' },
  { id: '10', test_number: 'T-2025-091', test_category: 'Clearance', status: 'Completed', client_id: '9', client_name: 'Palm Beach School District', property_address: '3300 Forest Hill Blvd Building C, West Palm Beach FL', scheduled_date: daysAgo(10), completed_date: daysAgo(7), technician_id: '2', technician_name: 'Elena Rodriguez', test_type: 'Air Quality', number_of_tests: 8, samples_collected: 8, results: 'Pass', lab_id: '3', lab_name: 'Florida Environmental Labs', recommendation_pdf_url: 'https://example.com/report2.pdf', recommendation_sent: true, recommendation_sent_date: daysAgo(6), referred_by: 'Direct', referred_by_company: '' },
  { id: '11', test_number: 'T-2025-088', test_category: 'Initial', status: 'Completed', client_id: '11', client_name: 'Sarah & David Kim', property_address: '1250 N Orange Ave, Orlando FL', scheduled_date: daysAgo(14), completed_date: daysAgo(10), technician_id: '3', technician_name: 'James Cooper', test_type: 'Full Assessment', number_of_tests: 5, samples_collected: 5, results: 'Normal', lab_id: '3', lab_name: 'Florida Environmental Labs', recommendation_pdf_url: 'https://example.com/report3.pdf', recommendation_sent: false, referred_by: 'All In One Restoration', referred_by_company: 'All In One Restoration' },
  { id: '12', test_number: 'T-2025-085', test_category: 'Initial', status: 'Completed', client_id: '12', client_name: 'Beachside Medical Center', property_address: '8500 Estero Blvd Wing B, Fort Myers Beach FL', scheduled_date: daysAgo(21), completed_date: daysAgo(17), technician_id: '1', technician_name: 'Marcus Johnson', test_type: 'Air Quality', number_of_tests: 10, samples_collected: 10, results: 'Elevated', lab_id: '1', lab_name: 'EMSL Analytical Inc', recommendation_pdf_url: 'https://example.com/report4.pdf', recommendation_sent: true, recommendation_sent_date: daysAgo(15), referred_by: 'Google', referred_by_company: '' },
  { id: '13', test_number: 'T-2025-082', test_category: 'Clearance', status: 'Completed', client_id: '1', client_name: 'Rodriguez Property Management', property_address: '1200 Brickell Ave Unit 1805, Miami FL', scheduled_date: daysAgo(25), completed_date: daysAgo(22), technician_id: '2', technician_name: 'Elena Rodriguez', test_type: 'Air Quality', number_of_tests: 3, samples_collected: 3, results: 'Pass', lab_id: '2', lab_name: 'Pro-Lab Diagnostics', recommendation_pdf_url: 'https://example.com/report5.pdf', recommendation_sent: true, recommendation_sent_date: daysAgo(20), referred_by: 'Referral', referred_by_company: 'Rodriguez Property Management' },
  { id: '14', test_number: 'T-2025-080', test_category: 'Initial', status: 'Completed', client_id: '14', client_name: 'Harbor View Rentals', property_address: '1500 Main St Unit 302, Sarasota FL', scheduled_date: daysAgo(30), completed_date: daysAgo(26), technician_id: '3', technician_name: 'James Cooper', test_type: 'Surface Swab', number_of_tests: 4, samples_collected: 4, results: 'Normal', lab_id: '3', lab_name: 'Florida Environmental Labs', recommendation_pdf_url: 'https://example.com/report6.pdf', recommendation_sent: false, referred_by: 'Website', referred_by_company: '' },
  { id: '15', test_number: 'T-2025-075', test_category: 'Initial', status: 'Completed', client_id: '15', client_name: 'The Anderson Family', property_address: '2800 NW 43rd St, Gainesville FL', scheduled_date: daysAgo(35), completed_date: daysAgo(31), technician_id: '1', technician_name: 'Marcus Johnson', test_type: 'Air Quality', number_of_tests: 3, samples_collected: 3, results: 'Elevated', lab_id: '1', lab_name: 'EMSL Analytical Inc', recommendation_pdf_url: 'https://example.com/report7.pdf', recommendation_sent: true, recommendation_sent_date: daysAgo(29), referred_by: 'Facebook', referred_by_company: '' },
];

const INITIAL_INVOICES = [
  // Paid invoices - with payment_method tracking
  { id: '1', invoice_number: 'INV-2025-001', test_id: '9', client_id: '7', client_name: 'First National Bank - Facilities', total: 1250, status: 'Paid', issue_date: daysAgo(5), due_date: daysAgo(0), paid_date: daysAgo(2), created_date: daysAgo(5), payment_method: 'ACH', check_number: '' },
  { id: '2', invoice_number: 'INV-2025-002', test_id: '10', client_id: '9', client_name: 'Palm Beach School District', total: 1800, status: 'Paid', issue_date: daysAgo(7), due_date: daysAgo(0), paid_date: daysAgo(4), created_date: daysAgo(7), payment_method: 'Check', check_number: '4521' },
  { id: '3', invoice_number: 'INV-2025-003', test_id: '11', client_id: '11', client_name: 'Sarah & David Kim', total: 650, status: 'Paid', issue_date: daysAgo(10), due_date: daysAgo(5), paid_date: daysAgo(8), created_date: daysAgo(10), payment_method: 'Zelle', check_number: '' },
  { id: '4', invoice_number: 'INV-2025-004', test_id: '12', client_id: '12', client_name: 'Beachside Medical Center', total: 2100, status: 'Paid', issue_date: daysAgo(17), due_date: daysAgo(10), paid_date: daysAgo(12), created_date: daysAgo(17), payment_method: 'Credit Card', check_number: '' },
  { id: '5', invoice_number: 'INV-2025-005', test_id: '13', client_id: '1', client_name: 'Rodriguez Property Management', total: 450, status: 'Paid', issue_date: daysAgo(22), due_date: daysAgo(15), paid_date: daysAgo(18), created_date: daysAgo(22), payment_method: 'Check', check_number: '8834' },
  { id: '6', invoice_number: 'INV-2025-006', test_id: '14', client_id: '14', client_name: 'Harbor View Rentals', total: 580, status: 'Paid', issue_date: daysAgo(26), due_date: daysAgo(19), paid_date: daysAgo(20), created_date: daysAgo(26), payment_method: 'Venmo', check_number: '' },

  // Sent invoices (awaiting payment)
  { id: '7', invoice_number: 'INV-2025-007', test_id: '6', client_id: '4', client_name: 'Atlantic Coast Insurance', total: 850, status: 'Sent', issue_date: daysAgo(3), due_date: daysFromNow(12), created_date: daysAgo(3), payment_method: '', check_number: '' },
  { id: '8', invoice_number: 'INV-2025-008', test_id: '7', client_id: '10', client_name: 'Evergreen Apartments LLC', total: 520, status: 'Sent', issue_date: daysAgo(2), due_date: daysFromNow(13), created_date: daysAgo(2), payment_method: '', check_number: '' },

  // Overdue invoices
  { id: '9', invoice_number: 'INV-2025-009', test_id: '15', client_id: '15', client_name: 'The Anderson Family', total: 475, status: 'Overdue', issue_date: daysAgo(31), due_date: daysAgo(16), created_date: daysAgo(31), payment_method: '', check_number: '' },
  { id: '10', invoice_number: 'INV-2024-098', client_id: '13', client_name: 'Thompson Construction Co', total: 1100, status: 'Overdue', issue_date: daysAgo(45), due_date: daysAgo(30), created_date: daysAgo(45), payment_method: '', check_number: '' },
];

const INITIAL_EXPENSES = [
  // Lab Fees
  { id: '1', description: 'EMSL Lab Analysis - 15 samples', category: 'Lab Fees', amount: 450, date: daysAgo(5), vendor: 'EMSL Analytical Inc', notes: 'Invoice #EMB-45892' },
  { id: '2', description: 'Pro-Lab Rush Testing', category: 'Lab Fees', amount: 320, date: daysAgo(10), vendor: 'Pro-Lab Diagnostics', notes: 'Rush order for insurance claim' },
  { id: '3', description: 'Florida Environmental - Bulk samples', category: 'Lab Fees', amount: 275, date: daysAgo(20), vendor: 'Florida Environmental Labs' },

  // Travel/Gas
  { id: '4', description: 'Gas - Marcus truck', category: 'Travel', amount: 85, date: daysAgo(1), vendor: 'Shell', notes: 'Weekly fill-up' },
  { id: '5', description: 'Gas - Elena vehicle', category: 'Travel', amount: 72, date: daysAgo(3), vendor: 'BP' },
  { id: '6', description: 'Toll charges - December', category: 'Travel', amount: 156, date: daysAgo(7), vendor: 'SunPass' },
  { id: '7', description: 'Gas - Company van', category: 'Travel', amount: 95, date: daysAgo(8), vendor: 'Chevron' },

  // Equipment
  { id: '8', description: 'Air sampling pumps (2)', category: 'Equipment', amount: 890, date: daysAgo(15), vendor: 'Zefon International', notes: 'Replacement pumps' },
  { id: '9', description: 'Calibration supplies', category: 'Equipment', amount: 125, date: daysAgo(22), vendor: 'SKC Inc' },
  { id: '10', description: 'Sample cassettes - 100 pack', category: 'Equipment', amount: 285, date: daysAgo(12), vendor: 'Zefon International' },

  // Marketing
  { id: '11', description: 'Google Ads - December', category: 'Google Ads', amount: 1500, date: daysAgo(5), vendor: 'Google', notes: 'Monthly campaign spend' },
  { id: '12', description: 'Facebook advertising', category: 'Marketing', amount: 350, date: daysAgo(10), vendor: 'Meta' },
  { id: '13', description: 'Business cards reorder', category: 'Marketing', amount: 89, date: daysAgo(25), vendor: 'VistaPrint' },

  // Salaries (monthly)
  { id: '14', description: 'Technician salaries - December', category: 'Salaries', amount: 12500, date: daysAgo(1), vendor: 'Payroll', notes: 'Bi-weekly payroll' },
  { id: '15', description: 'Technician salaries - December', category: 'Salaries', amount: 12500, date: daysAgo(15), vendor: 'Payroll', notes: 'Bi-weekly payroll' },

  // Other
  { id: '16', description: 'Office supplies', category: 'Other', amount: 156, date: daysAgo(18), vendor: 'Staples' },
  { id: '17', description: 'Software subscription - CRM', category: 'Other', amount: 99, date: daysAgo(5), vendor: 'Base44', notes: 'Monthly subscription' },
  { id: '18', description: 'Insurance premium', category: 'Other', amount: 850, date: daysAgo(30), vendor: 'State Farm', notes: 'General liability' },
];

const INITIAL_LEADS = [
  // Follow Up - with follow_up_date for calendar
  { id: '1', client_name: 'Maria Garcia', phone: '305-555-4001', email: 'maria.garcia@gmail.com', address: '2300 Collins Ave Apt 502, Miami Beach FL 33139', lead_source: 'Google', status: 'Follow Up', quote_amount: 450, notes: 'Called back - interested but wants to schedule for next week', created_date: daysAgo(2), follow_up_date: daysFromNow(1), referred_by_company: '' },
  { id: '2', client_name: 'Robert Chen', phone: '954-555-4002', email: 'rchen@outlook.com', address: '1500 E Sunrise Blvd, Fort Lauderdale FL 33304', lead_source: 'Referral', status: 'Follow Up', quote_amount: 650, notes: 'Referred by Rodriguez Property Management', created_date: daysAgo(3), follow_up_date: daysFromNow(0), referred_by_company: 'Rodriguez Property Management' },

  // Pending
  { id: '3', client_name: 'Amanda Johnson', phone: '407-555-4003', email: 'ajohnson@yahoo.com', address: '4200 International Dr, Orlando FL 32819', lead_source: 'Website', status: 'Pending', quote_amount: 500, notes: 'Submitted form, waiting for callback confirmation', created_date: daysAgo(1), follow_up_date: daysFromNow(0), referred_by_company: '' },
  { id: '4', client_name: 'David Lee', phone: '561-555-4004', email: 'davidlee@icloud.com', address: '900 S Dixie Hwy, Boca Raton FL 33432', lead_source: 'Facebook', status: 'Pending', quote_amount: 400, notes: 'New condo purchase, needs inspection', created_date: daysAgo(0), follow_up_date: daysFromNow(2), referred_by_company: '' },

  // Scheduled
  { id: '5', client_name: 'Patricia Moore', phone: '813-555-4005', email: 'pmoore@gmail.com', address: '3401 W Kennedy Blvd, Tampa FL 33609', lead_source: 'HomeAdvisor', status: 'Scheduled', quote_amount: 550, amount: 550, scheduled_date: daysFromNow(2), notes: 'Confirmed for Thursday 10am', created_date: daysAgo(5), referred_by_company: '' },
  { id: '6', client_name: 'William Turner', phone: '727-555-4006', email: 'wturner@hotmail.com', address: '2500 Drew St, Clearwater FL 33765', lead_source: 'Yelp', status: 'Scheduled', quote_amount: 480, amount: 480, scheduled_date: daysFromNow(4), notes: 'Scheduled for Saturday morning', created_date: daysAgo(4), referred_by_company: '' },

  // Completed
  { id: '7', client_name: 'Jennifer Smith', phone: '305-555-4007', email: 'jsmith@email.com', address: '1800 Brickell Ave Unit 1205, Miami FL 33129', lead_source: 'Google', status: 'Completed', quote_amount: 600, amount: 600, invoice_number: 'INV-2025-010', invoice_sent: true, in_reports: true, out_reports: true, paid: true, notes: 'Completed successfully, positive mold found - referred to remediation', created_date: daysAgo(10), referred_by_company: '' },
  { id: '8', client_name: 'Michael Brown', phone: '954-555-4008', email: 'mbrown@gmail.com', address: '3000 E Commercial Blvd, Fort Lauderdale FL 33308', lead_source: 'Referral', status: 'Completed', quote_amount: 750, amount: 750, invoice_number: 'INV-2025-011', invoice_sent: true, in_reports: true, out_reports: true, paid: true, notes: 'Clearance test passed', created_date: daysAgo(14), referred_by_company: 'All In One Restoration' },
  { id: '9', client_name: 'Sarah Davis', phone: '407-555-4009', email: 'sdavis@outlook.com', address: '5600 Major Blvd, Orlando FL 32819', lead_source: 'Website', status: 'Completed', quote_amount: 520, amount: 520, invoice_number: 'INV-2025-012', invoice_sent: true, in_reports: true, out_reports: false, paid: false, notes: 'Test complete, awaiting report delivery', created_date: daysAgo(7), referred_by_company: '' },

  // Canceled
  { id: '10', client_name: 'James Wilson', phone: '561-555-4010', email: 'jwilson2@gmail.com', address: '1200 S Federal Hwy, Delray Beach FL 33483', lead_source: 'Facebook', status: 'Canceled', quote_amount: 450, notes: 'Client decided to go with different company - price concern', created_date: daysAgo(8), referred_by_company: '' },
  { id: '11', client_name: 'Emily Anderson', phone: '786-555-4011', email: 'eanderson@yahoo.com', address: '7900 SW 104th St, Miami FL 33156', lead_source: 'Angi', status: 'Canceled', quote_amount: 580, notes: 'Property sale fell through', created_date: daysAgo(12), referred_by_company: '' },
];

// Check and update demo data version - clears old data if version changed
const checkDemoVersion = () => {
  try {
    const storedVersion = localStorage.getItem('demo_version');
    console.log('[Demo] Stored version:', storedVersion, 'Current version:', DEMO_DATA_VERSION);
    if (storedVersion !== String(DEMO_DATA_VERSION)) {
      console.log('[Demo] Version mismatch - clearing all demo data');
      // Clear all demo data to force refresh
      Object.keys(localStorage)
        .filter(k => k.startsWith('demo_'))
        .forEach(k => localStorage.removeItem(k));
      localStorage.setItem('demo_version', String(DEMO_DATA_VERSION));
    }
  } catch (e) {
    console.error('[Demo] Version check error:', e);
  }
};

// Run version check on load
if (typeof window !== 'undefined') {
  checkDemoVersion();

  // Force initialize ALL demo data immediately to avoid timing issues
  const initializeAllDemoData = () => {
    const dataToInit = {
      technicians: INITIAL_TECHNICIANS,
      labs: INITIAL_LABS,
      tests: INITIAL_TESTS,
      clients: INITIAL_CLIENTS,
      invoices: INITIAL_INVOICES,
      expenses: INITIAL_EXPENSES,
      leads: INITIAL_LEADS,
      users: INITIAL_USERS,
    };

    Object.entries(dataToInit).forEach(([key, initialData]) => {
      try {
        const stored = localStorage.getItem(`demo_${key}`);
        let needsInit = false;

        if (!stored) {
          needsInit = true;
          console.log(`[Demo] ${key}: no stored value, will initialize`);
        } else {
          try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed) || parsed.length === 0) {
              needsInit = true;
              console.log(`[Demo] ${key}: stored value empty or invalid, will initialize`);
            } else {
              console.log(`[Demo] ${key}: has ${parsed.length} items`);
            }
          } catch (parseErr) {
            needsInit = true;
            console.log(`[Demo] ${key}: parse error, will initialize`);
          }
        }

        if (needsInit && initialData.length > 0) {
          console.log(`[Demo] Force initializing ${key} with ${initialData.length} items`);
          localStorage.setItem(`demo_${key}`, JSON.stringify(initialData));
        }
      } catch (e) {
        console.error(`[Demo] Error initializing ${key}:`, e);
      }
    });
  };

  initializeAllDemoData();
}

// Helper to get/set data from localStorage with persistence
const getStoredData = (key, initialData) => {
  try {
    const stored = localStorage.getItem(`demo_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Re-init if stored data is null, not an array, OR empty array with available initial data.
      // This handles edge cases where localStorage has null, a string, or was corrupted.
      if (!Array.isArray(parsed) || (parsed.length === 0 && initialData.length > 0)) {
        console.log(`[Demo] ${key}: stored data invalid/empty, re-initializing with ${initialData.length} items`);
        localStorage.setItem(`demo_${key}`, JSON.stringify(initialData));
        return initialData;
      }
      console.log(`[Demo] ${key}: returning ${parsed.length} stored items`);
      return parsed;
    }
    // Initialize with default data
    console.log(`[Demo] ${key}: no stored data, initializing with ${initialData.length} items`);
    localStorage.setItem(`demo_${key}`, JSON.stringify(initialData));
    return initialData;
  } catch (e) {
    console.error(`[Demo] ${key} error:`, e);
    // On parse errors, reset the key and return initial data
    try { localStorage.setItem(`demo_${key}`, JSON.stringify(initialData)); } catch {}
    return initialData;
  }
};

// Force re-initialization of all demo data (used by "Reload Demo Data" button in QuickBooks settings)
export const reloadDemoData = () => {
  try {
    Object.keys(INITIAL_DATA_MAP).forEach(key => {
      const initialData = INITIAL_DATA_MAP[key];
      if (initialData && initialData.length > 0) {
        localStorage.setItem(`demo_${key}`, JSON.stringify(initialData));
        console.log(`[Demo] Reloaded ${key} with ${initialData.length} items`);
      }
    });
    return true;
  } catch (e) {
    console.error('[Demo] Failed to reload demo data:', e);
    return false;
  }
};

const saveData = (key, data) => {
  try {
    localStorage.setItem(`demo_${key}`, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`[Demo] Failed to save ${key} to localStorage:`, e);
    // QuotaExceededError or serialization error - notify so UI can show the user
    try {
      window.dispatchEvent(new CustomEvent('base44:save-error', {
        detail: { key, error: e.message || String(e) }
      }));
    } catch {}
    return false;
  }
};

// Generate a unique id. Prefer crypto.randomUUID (collision-safe); fall back
// to timestamp+random for older browsers.
const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// Hook for side effects (e.g., QuickBooks auto-sync). Components register
// callbacks via `registerEntityHook(entityKey, 'create' | 'update' | 'delete', fn)`.
// Hooks run after successful save and errors are swallowed (best-effort).
const ENTITY_HOOKS = { create: {}, update: {}, delete: {} };
export const registerEntityHook = (key, op, fn) => {
  if (!ENTITY_HOOKS[op]) return () => {};
  if (!ENTITY_HOOKS[op][key]) ENTITY_HOOKS[op][key] = new Set();
  ENTITY_HOOKS[op][key].add(fn);
  return () => ENTITY_HOOKS[op][key]?.delete(fn);
};
const runHooks = (key, op, item) => {
  const fns = ENTITY_HOOKS[op]?.[key];
  if (!fns) return;
  fns.forEach(fn => {
    try {
      const r = fn(item);
      if (r && typeof r.catch === 'function') r.catch(e => console.error(`[Hook ${key}.${op}]`, e));
    } catch (e) {
      console.error(`[Hook ${key}.${op}]`, e);
    }
  });
};

// Map of all initial data by key
const INITIAL_DATA_MAP = {
  tests: INITIAL_TESTS,
  clients: INITIAL_CLIENTS,
  technicians: INITIAL_TECHNICIANS,
  labs: INITIAL_LABS,
  invoices: INITIAL_INVOICES,
  expenses: INITIAL_EXPENSES,
  leads: INITIAL_LEADS,
  users: INITIAL_USERS,
  payments: [],
  documents: [],
  messages: [],
  settings: [],
};

// Create mock entity wrapper with localStorage persistence
const createMockEntity = (key) => {
  const getInitialData = () => {
    const data = INITIAL_DATA_MAP[key];
    console.log(`[Demo] getInitialData(${key}): found ${data ? data.length : 0} items`);
    return data || [];
  };

  return {
    list: () => {
      console.log(`[Demo] list() called for ${key}`);
      const initial = getInitialData();
      const data = getStoredData(key, initial);
      console.log(`[Demo] list(${key}): returning ${data.length} items`);
      return Promise.resolve([...data]);
    },
    get: (id) => {
      const data = getStoredData(key, getInitialData());
      return Promise.resolve(data.find(item => item.id === id));
    },
    create: (newItem) => {
      const data = getStoredData(key, getInitialData());
      const item = { id: generateId(), created_date: new Date().toISOString(), ...newItem };
      data.push(item);
      const ok = saveData(key, data);
      if (!ok) return Promise.reject(new Error('Failed to save - storage may be full'));
      runHooks(key, 'create', item);
      return Promise.resolve(item);
    },
    update: (id, updates) => {
      const data = getStoredData(key, getInitialData());
      const index = data.findIndex(item => item.id === id);
      if (index === -1) return Promise.resolve(null);
      data[index] = { ...data[index], ...updates, updated_date: new Date().toISOString() };
      const ok = saveData(key, data);
      if (!ok) return Promise.reject(new Error('Failed to save - storage may be full'));
      runHooks(key, 'update', data[index]);
      return Promise.resolve(data[index]);
    },
    delete: (id) => {
      const data = getStoredData(key, getInitialData());
      const removed = data.find(item => item.id === id);
      const filtered = data.filter(item => item.id !== id);
      const ok = saveData(key, filtered);
      if (!ok) return Promise.reject(new Error('Failed to save - storage may be full'));
      if (removed) runHooks(key, 'delete', removed);
      return Promise.resolve({ success: true });
    },
  };
};

// Create the real client
const realClient = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID || "68fe9e0ba7e63fa3c343bbd2",
  requiresAuth: !DEMO_MODE
});

// Mock client for demo mode with localStorage persistence
const mockClient = {
  entities: {
    Test: createMockEntity('tests'),
    Client: createMockEntity('clients'),
    Technician: createMockEntity('technicians'),
    Lab: createMockEntity('labs'),
    Invoice: createMockEntity('invoices'),
    Expense: createMockEntity('expenses'),
    Lead: createMockEntity('leads'),
    User: createMockEntity('users'),
    Payment: createMockEntity('payments'),
    Document: createMockEntity('documents'),
    Message: createMockEntity('messages'),
    AppSettings: createMockEntity('settings'),
  },
  auth: {
    me: () => Promise.resolve({ id: 'demo', full_name: 'Demo Admin', email: 'demo@example.com', app_role: 'Admin' }),
    logout: () => { window.location.href = '/'; },
  },
};

// Export the appropriate client based on demo mode
export const base44 = DEMO_MODE ? mockClient : realClient;
