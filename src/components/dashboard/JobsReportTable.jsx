import { Fragment, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";

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

    // Sort: most recent date first, jobs within a day sorted by scheduled time
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

  const toggleField = (test, field) => {
    onUpdateTest?.(test.id, { [field]: !test[field] });
  };

  const COL_COUNT = 11;

  return (
    <div className="clay-card rounded-3xl p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-800">Jobs Report</h2>
        </div>
        <Input
          placeholder="Search by company, test #, address, or tech..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="clay-button rounded-xl border-0 h-10 md:w-80"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Company</TableHead>
              <TableHead className="font-semibold text-gray-700">Sales Rep</TableHead>
              <TableHead className="font-semibold text-gray-700">Phone</TableHead>
              <TableHead className="font-semibold text-gray-700">Address</TableHead>
              <TableHead className="font-semibold text-gray-700">Test Type</TableHead>
              <TableHead className="font-semibold text-gray-700">Type &amp; Quantity</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Amount</TableHead>
              <TableHead className="font-semibold text-gray-700">Invoice</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Invoice Sent</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">In Reports</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Out Reports</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedByDate.length === 0 && (
              <TableRow>
                <TableCell colSpan={COL_COUNT} className="text-center py-10 text-gray-500">
                  No jobs to display
                </TableCell>
              </TableRow>
            )}

            {groupedByDate.map(({ key, dateObj, jobs, dailyTotal }) => (
              <Fragment key={key}>
                {/* Date header row */}
                <TableRow className="bg-yellow-50 hover:bg-yellow-50">
                  <TableCell colSpan={6} className="font-bold text-gray-800">
                    {dateObj ? formatDateHeader(dateObj) : "No Scheduled Date"}
                  </TableCell>
                  <TableCell className="font-bold text-emerald-600 text-right">
                    ${dailyTotal.toLocaleString()}
                  </TableCell>
                  <TableCell colSpan={4} />
                </TableRow>

                {/* Job rows */}
                {jobs.map((test) => {
                  const invoice = invoiceByTest.get(test.id);
                  const client = clientById.get(test.client_id);
                  const phone = test.client_phone || client?.phone || "";
                  const salesRep = test.sales_rep_name || test.technician_name || "";
                  const amount = invoice?.total || test.cost || 0;

                  return (
                    <TableRow key={test.id} className="hover:bg-orange-50/40">
                      <TableCell className="font-medium text-gray-800">
                        {test.client_name}
                      </TableCell>
                      <TableCell className="text-gray-700">{salesRep}</TableCell>
                      <TableCell className="text-gray-600 text-sm">{phone}</TableCell>
                      <TableCell className="text-gray-700 text-sm max-w-xs truncate" title={test.property_address}>
                        {test.property_address}
                      </TableCell>
                      <TableCell className="text-gray-700">{test.test_type}</TableCell>
                      <TableCell className="text-gray-700 text-sm">
                        {test.test_category}
                        {test.number_of_tests ? ` × ${test.number_of_tests}` : ""}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-800">
                        {amount > 0 ? `$${amount.toLocaleString()}` : ""}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {invoice?.invoice_number || ""}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!test.invoice_sent}
                          onCheckedChange={() => toggleField(test, "invoice_sent")}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!test.in_reports}
                          onCheckedChange={() => toggleField(test, "in_reports")}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!test.out_reports}
                          onCheckedChange={() => toggleField(test, "out_reports")}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
