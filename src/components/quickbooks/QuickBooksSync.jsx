import { useState, useEffect } from "react";
import {
  RefreshCw,
  Download,
  Upload,
  Check,
  AlertCircle,
  FileText,
  Users,
  DollarSign,
  Settings,
  ExternalLink,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// QuickBooks IIF export format helper
const generateIIF = {
  // Generate IIF header
  header: (type) => {
    const headers = {
      customers: '!CUST\tNAME\tBADDR1\tBADDR2\tBADDR3\tBADDR4\tPHONE1\tEMAIL\tCONT1\n',
      invoices: '!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\n!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n!ENDTRNS\n',
    };
    return headers[type] || '';
  },

  // Format customer for IIF
  customer: (client) => {
    const name = (client.name || '').replace(/\t/g, ' ');
    const address = (client.address || '').split(',');
    const addr1 = address[0]?.trim() || '';
    const addr2 = address.slice(1).join(',').trim() || '';
    const phone = (client.phone || '').replace(/\t/g, ' ');
    const email = (client.email || '').replace(/\t/g, ' ');

    return `CUST\t${name}\t${addr1}\t${addr2}\t\t\t${phone}\t${email}\t${name}\n`;
  },

  // Format invoice for IIF
  invoice: (invoice, lineItems = []) => {
    const date = invoice.issue_date ?
      new Date(invoice.issue_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) :
      new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

    const customerName = (invoice.client_name || '').replace(/\t/g, ' ');
    const amount = parseFloat(invoice.total) || 0;
    const docNum = invoice.invoice_number || '';
    const memo = (invoice.notes || 'Mold Testing Services').replace(/\t/g, ' ');

    // Transaction line
    let iif = `TRNS\t\tINVOICE\t${date}\tAccounts Receivable\t${customerName}\t${amount.toFixed(2)}\t${docNum}\t${memo}\n`;

    // Split line (income account)
    iif += `SPL\t\tINVOICE\t${date}\tServices Income\t${customerName}\t${(-amount).toFixed(2)}\t${memo}\n`;

    iif += `ENDTRNS\n`;

    return iif;
  }
};

export default function QuickBooksSync({ clients = [], invoices = [] }) {
  const [settings, setSettings] = useState({
    autoSync: false,
    syncInterval: 'daily',
    lastSync: null,
    accountsReceivable: 'Accounts Receivable',
    servicesIncome: 'Services Income',
    companyName: 'JohnMold Testing Services'
  });

  const [syncing, setSyncing] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quickbooks_settings');
      if (saved) {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (e) {
      console.error('Error loading QuickBooks settings:', e);
    }
  }, []);

  // Save settings
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('quickbooks_settings', JSON.stringify(newSettings));
    toast.success('QuickBooks settings saved');
  };

  // Export customers to IIF
  const exportCustomersIIF = () => {
    try {
      let iif = generateIIF.header('customers');

      clients.forEach(client => {
        iif += generateIIF.customer(client);
      });

      downloadFile(iif, `customers_${formatDateForFile()}.iif`, 'text/plain');
      toast.success(`Exported ${clients.length} customers`);
      setExportStatus({ type: 'customers', count: clients.length, date: new Date() });
    } catch (error) {
      console.error('Error exporting customers:', error);
      toast.error('Failed to export customers');
    }
  };

  // Export invoices to IIF
  const exportInvoicesIIF = (status = 'all') => {
    try {
      let filteredInvoices = invoices;

      if (status !== 'all') {
        filteredInvoices = invoices.filter(inv => inv.status === status);
      }

      let iif = generateIIF.header('invoices');

      filteredInvoices.forEach(invoice => {
        iif += generateIIF.invoice(invoice);
      });

      downloadFile(iif, `invoices_${status}_${formatDateForFile()}.iif`, 'text/plain');
      toast.success(`Exported ${filteredInvoices.length} invoices`);
      setExportStatus({ type: 'invoices', count: filteredInvoices.length, date: new Date() });

      // Update last sync
      saveSettings({ ...settings, lastSync: new Date().toISOString() });
    } catch (error) {
      console.error('Error exporting invoices:', error);
      toast.error('Failed to export invoices');
    }
  };

  // Export invoices to CSV (QuickBooks compatible)
  const exportInvoicesCSV = () => {
    try {
      const headers = [
        'Invoice Number',
        'Customer',
        'Invoice Date',
        'Due Date',
        'Amount',
        'Status',
        'Payment Method',
        'Paid Date',
        'Email',
        'Memo'
      ].join(',');

      const rows = invoices.map(inv => {
        return [
          inv.invoice_number || '',
          `"${(inv.client_name || '').replace(/"/g, '""')}"`,
          inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '',
          inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '',
          inv.total || 0,
          inv.status || '',
          inv.payment_method || '',
          inv.paid_date ? new Date(inv.paid_date).toLocaleDateString() : '',
          inv.client_email || '',
          `"${(inv.notes || '').replace(/"/g, '""')}"`
        ].join(',');
      }).join('\n');

      downloadFile(`${headers}\n${rows}`, `invoices_${formatDateForFile()}.csv`, 'text/csv');
      toast.success(`Exported ${invoices.length} invoices to CSV`);
    } catch (error) {
      console.error('Error exporting invoices CSV:', error);
      toast.error('Failed to export invoices');
    }
  };

  // Export customers to CSV
  const exportCustomersCSV = () => {
    try {
      const headers = [
        'Customer Name',
        'Email',
        'Phone',
        'Address',
        'Customer Type',
        'Sales Rep',
        'Sales Rep Phone',
        'Created Date'
      ].join(',');

      const rows = clients.map(client => {
        return [
          `"${(client.name || '').replace(/"/g, '""')}"`,
          client.email || '',
          client.phone || '',
          `"${(client.address || '').replace(/"/g, '""')}"`,
          client.client_type || '',
          client.sales_rep_name || '',
          client.sales_rep_phone || '',
          client.created_date ? new Date(client.created_date).toLocaleDateString() : ''
        ].join(',');
      }).join('\n');

      downloadFile(`${headers}\n${rows}`, `customers_${formatDateForFile()}.csv`, 'text/csv');
      toast.success(`Exported ${clients.length} customers to CSV`);
    } catch (error) {
      console.error('Error exporting customers CSV:', error);
      toast.error('Failed to export customers');
    }
  };

  // Helper to download file
  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Format date for filename
  const formatDateForFile = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Simulate sync
  const performSync = async () => {
    setSyncing(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Export both customers and invoices
      exportCustomersIIF();
      exportInvoicesIIF('all');

      toast.success('Sync completed successfully');
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Calculate stats
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
  const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled');
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">QuickBooks Integration</h2>
            <p className="text-sm text-gray-500">Export data for QuickBooks Desktop or Online</p>
          </div>
        </div>

        <Button
          onClick={performSync}
          disabled={syncing}
          className="clay-button rounded-2xl px-4 py-2 flex items-center gap-2 text-green-600 font-semibold"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Sync All
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" />
            Customers
          </div>
          <p className="text-2xl font-bold text-gray-800">{clients.length}</p>
        </div>
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <FileText className="w-4 h-4" />
            Invoices
          </div>
          <p className="text-2xl font-bold text-gray-800">{invoices.length}</p>
        </div>
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Paid
          </div>
          <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <XCircle className="w-4 h-4 text-orange-500" />
            Outstanding
          </div>
          <p className="text-2xl font-bold text-orange-600">${totalUnpaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Export */}
        <div className="clay-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-gray-800">Customer Export</h3>
          </div>

          <div className="space-y-3">
            <Button
              onClick={exportCustomersIIF}
              className="w-full clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-blue-600"
            >
              <Download className="w-4 h-4" />
              Export as IIF (QuickBooks Desktop)
            </Button>

            <Button
              onClick={exportCustomersCSV}
              className="w-full clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-blue-600"
            >
              <Download className="w-4 h-4" />
              Export as CSV (QuickBooks Online)
            </Button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Export {clients.length} customers to QuickBooks format
          </p>
        </div>

        {/* Invoice Export */}
        <div className="clay-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-green-500" />
            <h3 className="font-bold text-gray-800">Invoice Export</h3>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => exportInvoicesIIF('all')}
              className="w-full clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-green-600"
            >
              <Download className="w-4 h-4" />
              Export All as IIF
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => exportInvoicesIIF('Paid')}
                className="clay-button rounded-xl py-2 flex items-center justify-center gap-1.5 text-sm text-green-600"
              >
                <Check className="w-3 h-3" />
                Paid Only
              </Button>
              <Button
                onClick={() => exportInvoicesIIF('Sent')}
                className="clay-button rounded-xl py-2 flex items-center justify-center gap-1.5 text-sm text-orange-600"
              >
                <FileText className="w-3 h-3" />
                Unpaid Only
              </Button>
            </div>

            <Button
              onClick={exportInvoicesCSV}
              className="w-full clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-green-600"
            >
              <Download className="w-4 h-4" />
              Export as CSV
            </Button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            {paidInvoices.length} paid, {unpaidInvoices.length} outstanding
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="clay-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-500" />
          <h3 className="font-bold text-gray-800">Sync Settings</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-gray-700 font-medium">Auto-Sync</Label>
              <p className="text-sm text-gray-500">Automatically remind to sync data</p>
            </div>
            <Switch
              checked={settings.autoSync}
              onCheckedChange={(checked) => saveSettings({ ...settings, autoSync: checked })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Accounts Receivable Account</Label>
              <Input
                value={settings.accountsReceivable}
                onChange={(e) => setSettings({ ...settings, accountsReceivable: e.target.value })}
                onBlur={() => saveSettings(settings)}
                className="clay-button rounded-xl border-0"
                placeholder="Accounts Receivable"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Services Income Account</Label>
              <Input
                value={settings.servicesIncome}
                onChange={(e) => setSettings({ ...settings, servicesIncome: e.target.value })}
                onBlur={() => saveSettings(settings)}
                className="clay-button rounded-xl border-0"
                placeholder="Services Income"
              />
            </div>
          </div>

          {settings.lastSync && (
            <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
              <Calendar className="w-4 h-4" />
              Last synced: {new Date(settings.lastSync).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Help */}
      <div className="bg-blue-50 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-700 mb-1">How to Import</p>
            <ul className="text-blue-600 space-y-1">
              <li><strong>QuickBooks Desktop:</strong> File &gt; Utilities &gt; Import &gt; IIF Files</li>
              <li><strong>QuickBooks Online:</strong> Settings &gt; Import Data &gt; Customers/Invoices</li>
            </ul>
            <a
              href="https://quickbooks.intuit.com/learn-support/en-us/help-article/import-export/import-iif-files-quickbooks-desktop/L3oC1W3l3_US_en_US"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-700 hover:underline mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              QuickBooks Import Guide
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
