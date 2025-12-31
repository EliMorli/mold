import { FlaskConical, Receipt, Calendar, MapPin, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function ClientPortalView({ clientTests, clientInvoices }) {
  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lab Analysis': 'bg-orange-100 text-orange-700 border-orange-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
    'Cancelled': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const invoiceStatusColors = {
    'Draft': 'bg-gray-100 text-gray-700',
    'Sent': 'bg-blue-100 text-blue-700',
    'Paid': 'bg-green-100 text-green-700',
    'Overdue': 'bg-red-100 text-red-700',
    'Cancelled': 'bg-gray-100 text-gray-600',
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const upcomingTests = clientTests.filter(t => t.status === 'Scheduled' || t.status === 'In Progress');
  const completedTests = clientTests.filter(t => t.status === 'Completed');
  const openInvoices = clientInvoices.filter(i => i.status === 'Sent' || i.status === 'Overdue');

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="clay-card rounded-3xl p-8 bg-gradient-to-br from-blue-50 to-cyan-50">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Client Portal View</h2>
        <p className="text-gray-600">This is what your client sees when they log in</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-inner">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming Tests</p>
              <p className="text-2xl font-bold text-gray-800">{upcomingTests.length}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-800">{completedTests.length}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center shadow-inner">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Open Invoices</p>
              <p className="text-2xl font-bold text-orange-600">{openInvoices.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tests */}
      {upcomingTests.length > 0 && (
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Appointments
          </h3>
          <div className="space-y-3">
            {upcomingTests.map((test) => (
              <div key={test.id} className="clay-button rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{test.test_number}</h4>
                    <p className="text-sm text-gray-600">{test.test_type} - {test.test_category}</p>
                  </div>
                  <Badge className={`${statusColors[test.status]} border rounded-xl px-3 py-1 font-medium text-xs`}>
                    {test.status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span>{test.property_address}</span>
                  </div>
                  {test.scheduled_date && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 text-pink-400" />
                      <span className="font-medium">{formatDateTime(test.scheduled_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tests with Reports */}
      <div className="clay-card rounded-3xl p-6">
        <h3 className="text-lg font-bold text-green-600 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Completed Tests & Reports
        </h3>
        {completedTests.length > 0 ? (
          <div className="space-y-3">
            {completedTests.map((test) => (
              <div key={test.id} className="clay-button rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{test.test_number}</h4>
                    <p className="text-sm text-gray-600">{test.test_type} at {test.property_address}</p>
                    {test.scheduled_date && (
                      <p className="text-xs text-gray-500 mt-1">{formatDate(test.scheduled_date)}</p>
                    )}
                  </div>
                  <Badge className="bg-green-100 text-green-700 rounded-xl px-3 py-1 font-medium text-xs">
                    {test.results || 'Pending'}
                  </Badge>
                </div>
                
                {(test.lab_report_url || test.recommendation_pdf_url) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                    {test.lab_report_url && (
                      <a
                        href={test.lab_report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="clay-button rounded-xl px-3 py-2 text-xs font-medium text-blue-600 hover:scale-105 flex items-center gap-2"
                      >
                        <Download className="w-3 h-3" />
                        Lab Report
                      </a>
                    )}
                    {test.recommendation_pdf_url && (
                      <a
                        href={test.recommendation_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="clay-button rounded-xl px-3 py-2 text-xs font-medium text-green-600 hover:scale-105 flex items-center gap-2"
                      >
                        <Download className="w-3 h-3" />
                        Recommendations
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No completed tests yet</p>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="clay-card rounded-3xl p-6">
        <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Invoices & Payments
        </h3>
        {clientInvoices.length > 0 ? (
          <div className="space-y-3">
            {clientInvoices.map((invoice) => (
              <div key={invoice.id} className="clay-button rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Due: {formatDate(invoice.due_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-800">${invoice.total.toLocaleString()}</p>
                    <Badge className={`${invoiceStatusColors[invoice.status]} rounded-lg px-2 py-1 text-xs mt-1`}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No invoices yet</p>
          </div>
        )}
      </div>
    </div>
  );
}