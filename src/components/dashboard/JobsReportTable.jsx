import { Fragment, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Calendar as CalendarIcon, DollarSign, Briefcase, Inbox } from "lucide-react";

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

export default function JobsReportTable({ tests, invoices, clients, onUpdateTest }) {
  const [search, setSearch] = useState("");

  // Build invoice + client lookup maps
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

  // Filter + group by date
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

  const toggleField = (test, field) => {
    onUpdateTest?.(test.id, { [field]: !test[field] });
  };

  const COL_COUNT = 11;

  return (
    <div className="clay-card rounded-3xl p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="clay-button rounded-2xl p-2.5">
            <FileText className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">
              Jobs Report
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Track invoices and report delivery across every job
            </p>
          </div>
        </div>
        <div className="relative md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search by company, test #, address, or tech..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="clay-button rounded-xl border-0 h-10 pl-9"
          />
        </div>
      </div>

      {/* Summary chips */}
      {totals.jobCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="clay-button rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs text-gray-500">Jobs</span>
            <span className="text-sm font-bold text-gray-800">{totals.jobCount}</span>
          </div>
          <div className="clay-button rounded-xl px-3 py-1.5 flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs text-gray-500">Days</span>
            <span className="text-sm font-bold text-gray-800">{totals.dayCount}</span>
          </div>
          <div className="clay-button rounded-xl px-3 py-1.5 flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-gray-500">Total</span>
            <span className="text-sm font-bold text-emerald-600">
              ${totals.grandTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gradient-to-b from-gray-50 to-gray-100 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
              <TableRow className="hover:bg-transparent border-b border-gray-200">
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Company</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Sales Rep</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Phone</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Address</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Test Type</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Type &amp; Qty</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Amount</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Invoice</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-center">Sent</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-center">In</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-center">Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedByDate.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={COL_COUNT} className="py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                      <div className="clay-button rounded-2xl p-4">
                        <Inbox className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        {search ? "No jobs match your search" : "No jobs to display"}
                      </p>
                      {search && (
                        <button
                          onClick={() => setSearch("")}
                          className="text-xs text-purple-500 hover:text-purple-600 font-medium"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {groupedByDate.map(({ key, dateObj, jobs, dailyTotal }) => {
                const today = isToday(dateObj);
                return (
                  <Fragment key={key}>
                    {/* Date header row */}
                    <TableRow className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 hover:from-amber-50 hover:via-yellow-50 hover:to-amber-50 border-y border-amber-100">
                      <TableCell colSpan={6} className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <CalendarIcon className="w-4 h-4 text-amber-600" />
                          <span className="font-bold text-gray-800">
                            {dateObj ? formatDateHeader(dateObj) : "No Scheduled Date"}
                          </span>
                          {today && (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5">
                              Today
                            </Badge>
                          )}
                          <Badge className="bg-white/70 text-gray-600 hover:bg-white/70 border border-amber-200 text-[10px] font-semibold px-2 py-0.5">
                            {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600 text-right tabular-nums py-2.5">
                        ${dailyTotal.toLocaleString()}
                      </TableCell>
                      <TableCell colSpan={4} />
                    </TableRow>

                    {/* Job rows */}
                    {jobs.map((test, idx) => {
                      const invoice = invoiceByTest.get(test.id);
                      const client = clientById.get(test.client_id);
                      const phone = test.client_phone || client?.phone || "";
                      const salesRep = test.sales_rep_name || test.technician_name || "";
                      const amount = invoice?.total || test.cost || 0;
                      const zebra = idx % 2 === 1 ? "bg-gray-50/40" : "";

                      return (
                        <TableRow
                          key={test.id}
                          className={`group transition-colors ${zebra} hover:bg-purple-50/40`}
                        >
                          <TableCell className="font-medium text-gray-800">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[180px]" title={test.client_name}>
                                {test.client_name}
                              </span>
                              {test.test_number && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  #{test.test_number}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm">{salesRep || <span className="text-gray-300">—</span>}</TableCell>
                          <TableCell className="text-gray-600 text-sm tabular-nums">
                            {phone || <span className="text-gray-300">—</span>}
                          </TableCell>
                          <TableCell
                            className="text-gray-700 text-sm max-w-xs truncate"
                            title={test.property_address}
                          >
                            {test.property_address || <span className="text-gray-300">—</span>}
                          </TableCell>
                          <TableCell>
                            {test.test_type ? (
                              <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-0 text-xs font-medium">
                                {test.test_type}
                              </Badge>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm">
                            {test.test_category ? (
                              <span>
                                {test.test_category}
                                {test.number_of_tests ? (
                                  <span className="text-gray-400 font-mono"> × {test.number_of_tests}</span>
                                ) : ""}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-gray-800 tabular-nums">
                            {amount > 0 ? (
                              `$${amount.toLocaleString()}`
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm font-mono">
                            {invoice?.invoice_number ? (
                              <span className="text-indigo-600">{invoice.invoice_number}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={!!test.invoice_sent}
                                onCheckedChange={() => toggleField(test, "invoice_sent")}
                                className="h-5 w-5 rounded-md data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                aria-label="Invoice sent"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={!!test.in_reports}
                                onCheckedChange={() => toggleField(test, "in_reports")}
                                className="h-5 w-5 rounded-md data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                                aria-label="In reports"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={!!test.out_reports}
                                onCheckedChange={() => toggleField(test, "out_reports")}
                                className="h-5 w-5 rounded-md data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                aria-label="Out reports"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer summary */}
      {totals.jobCount > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing <span className="font-semibold text-gray-700">{totals.jobCount}</span>{" "}
            {totals.jobCount === 1 ? "job" : "jobs"} across{" "}
            <span className="font-semibold text-gray-700">{totals.dayCount}</span>{" "}
            {totals.dayCount === 1 ? "day" : "days"}
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Sent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-sky-500" /> In
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-purple-500" /> Out
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
