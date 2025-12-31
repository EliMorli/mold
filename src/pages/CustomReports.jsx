import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Download, Calendar, FileText, Users, FlaskConical, Receipt, Wallet, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function CustomReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportType, setReportType] = useState("tests");
  const [selectedFields, setSelectedFields] = useState([]);
  const [generating, setGenerating] = useState(false);

  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list(),
    initialData: []
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: []
  });

  const reportConfigs = {
    tests: {
      name: "Tests Report",
      icon: FlaskConical,
      color: "purple",
      fields: [
        { id: "test_number", label: "Test Number" },
        { id: "test_type", label: "Test Type" },
        { id: "test_category", label: "Category" },
        { id: "status", label: "Status" },
        { id: "client_name", label: "Client Name" },
        { id: "property_address", label: "Property Address" },
        { id: "scheduled_date", label: "Scheduled Date" },
        { id: "completed_date", label: "Completed Date" },
        { id: "technician_name", label: "Technician" },
        { id: "lab_name", label: "Lab" },
        { id: "results", label: "Results" },
        { id: "cost", label: "Cost" },
        { id: "samples_collected", label: "Samples Collected" }
      ]
    },
    invoices: {
      name: "Invoices Report",
      icon: Receipt,
      color: "green",
      fields: [
        { id: "invoice_number", label: "Invoice Number" },
        { id: "client_name", label: "Client Name" },
        { id: "test_number", label: "Test Number" },
        { id: "issue_date", label: "Issue Date" },
        { id: "due_date", label: "Due Date" },
        { id: "amount", label: "Amount" },
        { id: "tax", label: "Tax" },
        { id: "total", label: "Total" },
        { id: "amount_paid", label: "Amount Paid" },
        { id: "status", label: "Status" },
        { id: "payment_method", label: "Payment Method" },
        { id: "paid_date", label: "Paid Date" }
      ]
    },
    expenses: {
      name: "Expenses Report",
      icon: Wallet,
      color: "red",
      fields: [
        { id: "expense_id", label: "Expense ID" },
        { id: "description", label: "Description" },
        { id: "category", label: "Category" },
        { id: "amount", label: "Amount" },
        { id: "date", label: "Date" },
        { id: "vendor", label: "Vendor" },
        { id: "payment_method", label: "Payment Method" },
        { id: "status", label: "Status" },
        { id: "technician_name", label: "Technician" }
      ]
    },
    clients: {
      name: "Clients Report",
      icon: Users,
      color: "blue",
      fields: [
        { id: "name", label: "Name" },
        { id: "client_type", label: "Type" },
        { id: "email", label: "Email" },
        { id: "phone", label: "Phone" },
        { id: "address", label: "Address" },
        { id: "status", label: "Status" },
        { id: "total_tests", label: "Total Tests" },
        { id: "total_spent", label: "Total Spent" },
        { id: "sales_rep_name", label: "Sales Rep" },
        { id: "commission_percentage", label: "Commission %" }
      ]
    }
  };

  const currentConfig = reportConfigs[reportType];

  const toggleField = (fieldId) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(currentConfig.fields.map(f => f.id));
  };

  const clearAllFields = () => {
    setSelectedFields([]);
  };

  const getFilteredData = () => {
    let data = [];
    
    switch (reportType) {
      case "tests":
        data = tests;
        break;
      case "invoices":
        data = invoices;
        break;
      case "expenses":
        data = expenses;
        break;
      case "clients":
        data = clients;
        break;
    }

    // Apply date filter
    if (startDate || endDate) {
      data = data.filter(item => {
        let dateField;
        
        if (reportType === "tests") {
          dateField = item.completed_date || item.scheduled_date || item.created_date;
        } else if (reportType === "invoices") {
          dateField = item.paid_date || item.issue_date;
        } else if (reportType === "expenses") {
          dateField = item.date;
        } else {
          dateField = item.created_date;
        }

        if (!dateField) return false;
        
        const itemDate = new Date(dateField);
        if (startDate && itemDate < new Date(startDate)) return false;
        if (endDate && itemDate > new Date(endDate + "T23:59:59")) return false;
        
        return true;
      });
    }

    return data;
  };

  const generateCSV = () => {
    if (selectedFields.length === 0) {
      alert("Please select at least one field to export");
      return;
    }

    setGenerating(true);
    
    try {
      const data = getFilteredData();
      
      // Create CSV headers
      const headers = selectedFields.map(fieldId => {
        const field = currentConfig.fields.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
      }).join(",");

      // Create CSV rows
      const rows = data.map(item => {
        return selectedFields.map(fieldId => {
          let value = item[fieldId] || "";
          
          // Format dates
          if (value && (fieldId.includes("date") || fieldId === "scheduled_date" || fieldId === "completed_date")) {
            value = new Date(value).toLocaleDateString();
          }
          
          // Escape commas and quotes
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          
          return value;
        }).join(",");
      }).join("\n");

      const csv = headers + "\n" + rows;
      
      // Download CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateRange = startDate && endDate ? `_${startDate}_to_${endDate}` : "";
      a.download = `${reportType}_report${dateRange}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setGenerating(false);
    } catch (error) {
      console.error("Error generating CSV:", error);
      alert("Failed to generate report");
      setGenerating(false);
    }
  };

  const filteredData = getFilteredData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-inner">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Custom Reports
            </h1>
            <p className="text-gray-500 mt-1">Generate and export custom data reports</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Report Type Selection */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Report Type</h3>
            <div className="space-y-2">
              {Object.entries(reportConfigs).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setReportType(key);
                    setSelectedFields([]);
                  }}
                  className={`w-full clay-button rounded-2xl p-4 flex items-center gap-3 hover:scale-[1.02] transition-all ${
                    reportType === key ? "clay-nav-active" : ""
                  }`}
                >
                  <config.icon className={`w-5 h-5 text-${config.color}-600`} />
                  <span className="font-medium text-gray-700">{config.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-800">Date Range</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="clay-button rounded-2xl border-0"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="clay-button rounded-2xl border-0"
                />
              </div>
              <Button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                variant="outline"
                className="w-full clay-button rounded-2xl text-gray-600"
              >
                Clear Dates
              </Button>
            </div>
          </div>
        </div>

        {/* Fields Selection & Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Field Selection */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-800">Select Fields</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={selectAllFields}
                  variant="outline"
                  className="clay-button rounded-2xl px-4 py-2 text-sm"
                >
                  Select All
                </Button>
                <Button
                  onClick={clearAllFields}
                  variant="outline"
                  className="clay-button rounded-2xl px-4 py-2 text-sm"
                >
                  Clear All
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {currentConfig.fields.map((field) => (
                <div
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className="clay-button rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-all"
                >
                  <Checkbox
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                  <span className="text-sm text-gray-700">{field.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview & Export */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Preview</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {filteredData.length} records • {selectedFields.length} fields selected
                </p>
              </div>
              <Button
                onClick={generateCSV}
                disabled={generating || selectedFields.length === 0 || filteredData.length === 0}
                className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-green-600 hover:scale-105"
              >
                <Download className="w-5 h-5" />
                {generating ? "Generating..." : "Export CSV"}
              </Button>
            </div>

            {selectedFields.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select fields to preview data</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No data found for selected date range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {selectedFields.map((fieldId) => {
                        const field = currentConfig.fields.find(f => f.id === fieldId);
                        return (
                          <th key={fieldId} className="text-left py-3 px-2 text-gray-600 font-semibold">
                            {field?.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        {selectedFields.map((fieldId) => {
                          let value = item[fieldId] || "-";
                          
                          // Format dates
                          if (value !== "-" && (fieldId.includes("date") || fieldId === "scheduled_date" || fieldId === "completed_date")) {
                            value = new Date(value).toLocaleDateString();
                          }
                          
                          return (
                            <td key={fieldId} className="py-3 px-2 text-gray-700">
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.length > 10 && (
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Showing 10 of {filteredData.length} records. Export to see all data.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}