import { Fragment, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  Calendar as CalendarIcon,
  DollarSign,
  Briefcase,
  Users,
  Plus,
  Send,
  CheckCircle,
  Phone,
  MapPin,
} from "lucide-react";

const formatDateHeader = (date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const toDateKey = (d) => {
  if (!d) return "no-date";
  const date = new Date(d);
  if (isNaN(date)) return "no-date";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const isToday = (date) => {
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export default function JobsReportTable({ tests, invoices, clients, onUpdateTest, onCreateInvoice, onSendInvoice }) {
  const [search, setSearch] = useState("");

  const invoiceByTest = useMemo(() => {
    const map = new Map();
    for (const inv of invoices) {
      if (inv.test_id) map.set(inv.test_id, inv);
    }
    return map;
  }, [invoices]);

  const clientById = useMemo(() => {
    const map = new Map();
    for (const c of clients || []) map.set(c.id, c);
    return map;
  }, [clients]);

  const groupedByDate = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = tests.filter((t) => {
      if (!q) return true;
      return (
        t.client_name?.toLowerCase().includes(q) ||
        t.test_number?.toLowerCase().includes(q) ||
        t.property_address?.toLowerCase().includes(q) ||
        t.technician_name?.toLowerCase().includes(q)
      );
    });

    const groups = new Map();
    for (const test of filtered) {
      const key = toDateKey(test.scheduled_date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(test);
    }

    const sorted = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === "no-date") return 1;
      if (b[0] === "no-date") return -1;
      return b[0].localeCompare(a[0]);
    });

    return sorted.map(([key, jobs]) => {
      jobs.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
      const dateObj = key === "no-date" ? null : new Date(key + "T00:00:00");
      const dailyTotal = jobs.reduce((sum, t) => {
        const inv = invoiceByTest.get(t.id);
        return sum + (inv?.total || t.cost || 0);
      }, 0);
      return { key, dateObj, jobs, dailyTotal };
    });
  }, [tests, invoiceByTest, search]);

  const totals = useMemo(() => {
    let jobCount = 0;
    let grandTotal = 0;
    for (const g of groupedByDate) {
      jobCount += g.jobs.length;
      grandTotal += g.dailyTotal;
    }
    return { jobCount, grandTotal, dayCount: groupedByDate.length };
  }, [groupedByDate]);

  const toggleField = (e, test, field) => {
    e.stopPropagation();
    onUpdateTest?.(test.id, { [field]: !test[field] });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">
              Jobs Report
            </h2>
            <p className="text-gray-500 mt-1">
              {totals.jobCount} jobs across {totals.dayCount} days
            </p>
          </div>
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
            <Input
              placeholder="Search by company, test #, address, or tech..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Jobs</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totals.jobCount}</p>
        </div>
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Days</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totals.dayCount}</p>
        </div>
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Amount</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${totals.grandTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="clay-card rounded-3xl p-6 overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Company</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Sales Rep</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Contact</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Address</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Test Type</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Type & Qty</th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Sent</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">In Reports</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Out Reports</th>
            </tr>
          </thead>
          <tbody>
            {groupedByDate.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">
                    {search ? "No jobs match your search" : "No jobs to display"}
                  </h3>
                  <p className="text-gray-500">
                    {search ? (
                      <button
                        onClick={() => setSearch("")}
                        className="text-purple-500 hover:text-purple-600 font-medium"
                      >
                        Clear search
                      </button>
                    ) : (
                      "Jobs will appear here once scheduled"
                    )}
                  </p>
                </td>
              </tr>
            )}

            {groupedByDate.map(({ key, dateObj, jobs, dailyTotal }) => {
              const today = isToday(dateObj);
              return (
                <Fragment key={key}>
                  {/* Date header row */}
                  <tr className="bg-gradient-to-r from-amber-50 to-yellow-50">
                    <td colSpan={6} className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-gray-800">
                          {dateObj ? formatDateHeader(dateObj) : "No Scheduled Date"}
                        </span>
                        {today && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-bold px-2">
                            Today
                          </Badge>
                        )}
                        <Badge className="bg-white text-gray-600 border border-amber-200 text-xs font-medium px-2">
                          {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-bold text-emerald-600 text-lg">
                        ${dailyTotal.toLocaleString()}
                      </span>
                    </td>
                    <td colSpan={4}></td>
                  </tr>

                  {/* Job rows */}
                  {jobs.map((test) => {
                    const invoice = invoiceByTest.get(test.id);
                    const client = clientById.get(test.client_id);
                    const phone = test.client_phone || client?.phone || "";
                    const salesRep = test.sales_rep_name || test.technician_name || "";
                    const amount = invoice?.total || test.cost || 0;

                    return (
                      <tr
                        key={test.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-semibold text-gray-800">{test.client_name || "-"}</p>
                            {test.test_number && (
                              <p className="text-xs text-gray-400 font-mono">#{test.test_number}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-gray-600">{salesRep || "-"}</span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm">
                            {phone ? (
                              <p className="flex items-center gap-1 text-gray-600">
                                <Phone className="w-3 h-3" /> {phone}
                              </p>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {test.property_address ? (
                            <p className="flex items-center gap-1 text-sm text-gray-600 max-w-[200px] truncate" title={test.property_address}>
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{test.property_address}</span>
                            </p>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {test.test_type ? (
                            <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs font-medium">
                              {test.test_type}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-gray-600">
                            {test.test_category || "-"}
                            {test.number_of_tests ? ` × ${test.number_of_tests}` : ""}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-sm font-bold text-gray-800">
                            {amount > 0 ? `$${amount.toLocaleString()}` : "-"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {invoice ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs text-gray-600 font-mono">{invoice.invoice_number}</span>
                              {invoice.status === 'Draft' && onSendInvoice && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSendInvoice(invoice);
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                                >
                                  <Send className="w-3 h-3" /> Send
                                </button>
                              )}
                              {invoice.status === 'Sent' && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">Sent</Badge>
                              )}
                              {invoice.status === 'Paid' && (
                                <Badge className="bg-green-100 text-green-700 text-xs">Paid</Badge>
                              )}
                              {invoice.status === 'Overdue' && (
                                <Badge className="bg-red-100 text-red-700 text-xs">Overdue</Badge>
                              )}
                            </div>
                          ) : onCreateInvoice ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCreateInvoice(test);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-purple-600"
                            >
                              <Plus className="w-3 h-3" /> Create
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => toggleField(e, test, "invoice_sent")}
                            className="focus:outline-none"
                          >
                            {test.invoice_sent ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto hover:border-green-400 transition-colors" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => toggleField(e, test, "in_reports")}
                            className="focus:outline-none"
                          >
                            {test.in_reports ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto hover:border-green-400 transition-colors" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => toggleField(e, test, "out_reports")}
                            className="focus:outline-none"
                          >
                            {test.out_reports ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto hover:border-green-400 transition-colors" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
