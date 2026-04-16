import { useState, useEffect } from "react";
import {
  RefreshCw,
  Download,
  Check,
  AlertCircle,
  FileText,
  Users,
  DollarSign,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Unlink,
  Building2,
  ArrowRight,
  AlertTriangle,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as QB from "@/services/quickbooks";

// ---------- IIF/CSV fallback helpers ----------
const generateIIF = {
  header: (type) => ({
    customers: '!CUST\tNAME\tBADDR1\tBADDR2\tBADDR3\tBADDR4\tPHONE1\tEMAIL\tCONT1\n',
    invoices: '!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\n!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n!ENDTRNS\n',
  }[type] || ''),
  customer: (c) => {
    const name = (c.name || '').replace(/\t/g, ' ');
    const address = (c.address || '').split(',');
    const addr1 = address[0]?.trim() || '';
    const addr2 = address.slice(1).join(',').trim() || '';
    const phone = (c.phone || '').replace(/\t/g, ' ');
    const email = (c.email || '').replace(/\t/g, ' ');
    return `CUST\t${name}\t${addr1}\t${addr2}\t\t\t${phone}\t${email}\t${name}\n`;
  },
  invoice: (inv) => {
    const date = inv.issue_date
      ? new Date(inv.issue_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const customerName = (inv.client_name || '').replace(/\t/g, ' ');
    const amount = parseFloat(inv.total) || 0;
    const docNum = inv.invoice_number || '';
    const memo = (inv.notes || 'Mold Testing Services').replace(/\t/g, ' ');
    return (
      `TRNS\t\tINVOICE\t${date}\tAccounts Receivable\t${customerName}\t${amount.toFixed(2)}\t${docNum}\t${memo}\n` +
      `SPL\t\tINVOICE\t${date}\tServices Income\t${customerName}\t${(-amount).toFixed(2)}\t${memo}\n` +
      `ENDTRNS\n`
    );
  },
};

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

const formatDateForFile = () => new Date().toISOString().split('T')[0];

// ---------- Main component ----------
export default function QuickBooksSync({ clients = [], invoices = [] }) {
  const [connectionInfo, setConnectionInfo] = useState(QB.getConnectionInfo());
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [activeTab, setActiveTab] = useState('sync'); // 'sync' | 'export'

  const hasCreds = QB.hasCredentials();

  // Handle OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const realmId = urlParams.get('realmId');

    if (code && state && realmId) {
      (async () => {
        setConnecting(true);
        try {
          await QB.handleOAuthCallback(code, state, realmId);
          setConnectionInfo(QB.getConnectionInfo());
          toast.success('Successfully connected to QuickBooks!');
        } catch (e) {
          console.error('OAuth error:', e);
          toast.error(e.message || 'Failed to connect to QuickBooks');
        } finally {
          setConnecting(false);
          // Clean up URL
          const cleanUrl = window.location.pathname + '?tab=quickbooks';
          window.history.replaceState({}, '', cleanUrl);
        }
      })();
    }
  }, []);

  const handleConnect = () => {
    try {
      window.location.href = QB.getAuthorizationUrl();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await QB.disconnect();
      setConnectionInfo({ isConnected: false });
      setSyncResults(null);
      toast.success('Disconnected from QuickBooks. Next connect will prompt for company selection.');
    } catch (e) {
      // Fallback: clear local tokens even if revoke fails
      QB.clearTokens();
      setConnectionInfo({ isConnected: false });
      setSyncResults(null);
      toast.success('Disconnected locally');
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResults(null);
    try {
      const results = await QB.performFullSync(clients, invoices);
      setSyncResults(results);
      const totalCreated = results.customers.created + results.invoices.created;
      const totalErrors = results.customers.errors.length + results.invoices.errors.length;
      if (totalErrors === 0) {
        toast.success(`Synced ${totalCreated} records to QuickBooks`);
      } else {
        toast.message(`Synced ${totalCreated} records, ${totalErrors} errors`);
      }
    } catch (e) {
      console.error('Sync error:', e);
      toast.error(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCustomers = async () => {
    setSyncing(true);
    try {
      const results = await QB.syncCustomersToQB(clients);
      toast.success(`Created ${results.created}, skipped ${results.skipped} customers`);
    } catch (e) {
      toast.error(e.message || 'Failed to sync customers');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncInvoices = async () => {
    setSyncing(true);
    try {
      const results = await QB.syncInvoicesToQB(invoices);
      toast.success(`Created ${results.created}, skipped ${results.skipped} invoices`);
    } catch (e) {
      toast.error(e.message || 'Failed to sync invoices');
    } finally {
      setSyncing(false);
    }
  };

  // Export fallback handlers
  const exportCustomersIIF = () => {
    let iif = generateIIF.header('customers');
    clients.forEach(c => { iif += generateIIF.customer(c); });
    downloadFile(iif, `customers_${formatDateForFile()}.iif`, 'text/plain');
    toast.success(`Exported ${clients.length} customers`);
  };
  const exportInvoicesIIF = () => {
    let iif = generateIIF.header('invoices');
    invoices.forEach(i => { iif += generateIIF.invoice(i); });
    downloadFile(iif, `invoices_${formatDateForFile()}.iif`, 'text/plain');
    toast.success(`Exported ${invoices.length} invoices`);
  };
  const exportCustomersCSV = () => {
    const headers = ['Customer Name', 'Email', 'Phone', 'Address', 'Customer Type'].join(',');
    const rows = clients.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      c.email || '',
      c.phone || '',
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.client_type || ''
    ].join(',')).join('\n');
    downloadFile(`${headers}\n${rows}`, `customers_${formatDateForFile()}.csv`, 'text/csv');
    toast.success(`Exported ${clients.length} customers`);
  };
  const exportInvoicesCSV = () => {
    const headers = ['Invoice Number', 'Customer', 'Date', 'Due Date', 'Amount', 'Status'].join(',');
    const rows = invoices.map(inv => [
      inv.invoice_number || '',
      `"${(inv.client_name || '').replace(/"/g, '""')}"`,
      inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '',
      inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '',
      inv.total || 0,
      inv.status || ''
    ].join(',')).join('\n');
    downloadFile(`${headers}\n${rows}`, `invoices_${formatDateForFile()}.csv`, 'text/csv');
    toast.success(`Exported ${invoices.length} invoices`);
  };

  const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
  const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled');
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">QuickBooks Integration</h2>
            <p className="text-sm text-gray-500">
              {connectionInfo.isConnected
                ? `Connected to ${connectionInfo.companyName || 'QuickBooks'}`
                : 'Connect to sync customers and invoices automatically'}
            </p>
          </div>
        </div>

        {connectionInfo.isConnected ? (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-700 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Connected
            </Badge>
            <Button
              onClick={handleDisconnect}
              className="clay-button rounded-xl px-3 py-2 flex items-center gap-1.5 text-red-600 text-sm"
            >
              <Unlink className="w-4 h-4" />
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={connecting || !hasCreds}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl px-4 py-2 flex items-center gap-2 font-semibold disabled:opacity-50"
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
            Connect to QuickBooks
          </Button>
        )}
      </div>

      {/* Setup Warning */}
      {!hasCreds && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <p className="font-medium text-yellow-800 mb-1">QuickBooks API Credentials Required</p>
              <p className="text-yellow-700 mb-2">
                To enable Live Sync, configure these environment variables on your hosting platform (e.g., Vercel):
              </p>
              <code className="block bg-yellow-100 p-2 rounded-lg text-xs text-yellow-800 overflow-x-auto">
                VITE_QUICKBOOKS_CLIENT_ID=...{'\n'}
                VITE_QUICKBOOKS_REDIRECT_URI={window.location.origin}/Settings?tab=quickbooks{'\n'}
                VITE_QUICKBOOKS_ENVIRONMENT=sandbox{'\n'}
                {'\n'}
                # Server-side only (NOT VITE_ prefix - keeps secret hidden):{'\n'}
                QUICKBOOKS_CLIENT_ID=...{'\n'}
                QUICKBOOKS_CLIENT_SECRET=...{'\n'}
                QUICKBOOKS_REDIRECT_URI={window.location.origin}/Settings?tab=quickbooks
              </code>
              <a
                href="https://developer.intuit.com/app/developer/qbo/docs/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-yellow-800 hover:underline mt-2 font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                Get API credentials from Intuit Developer
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Security Badge */}
      {hasCreds && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700">
            <strong>Secure:</strong> Token exchange happens server-side. Client secret is never exposed to the browser.
          </p>
        </div>
      )}

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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'sync' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Live Sync
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'export' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Download className="w-4 h-4 inline mr-2" />
          Manual Export
        </button>
      </div>

      {/* Live Sync Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          {connectionInfo.isConnected ? (
            <>
              <div className="clay-card rounded-2xl p-5">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-green-500" />
                  Sync to QuickBooks
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={handleSyncAll}
                    disabled={syncing}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                  >
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync All
                  </Button>
                  <Button
                    onClick={handleSyncCustomers}
                    disabled={syncing}
                    className="clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-blue-600 disabled:opacity-50"
                  >
                    <Users className="w-4 h-4" />
                    Sync Customers
                  </Button>
                  <Button
                    onClick={handleSyncInvoices}
                    disabled={syncing}
                    className="clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-purple-600 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    Sync Invoices
                  </Button>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  Creates new records in QuickBooks. Duplicates (by name / invoice #) are skipped.
                </p>
              </div>

              {syncResults && (
                <div className="clay-card rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-3">Last Sync Results</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-sm text-blue-600 font-medium">Customers</p>
                      <p className="text-xl font-bold text-blue-700">{syncResults.customers.created} created</p>
                      <p className="text-xs text-blue-500">
                        {syncResults.customers.skipped} skipped
                        {syncResults.customers.errors.length > 0 && `, ${syncResults.customers.errors.length} errors`}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3">
                      <p className="text-sm text-purple-600 font-medium">Invoices</p>
                      <p className="text-xl font-bold text-purple-700">{syncResults.invoices.created} created</p>
                      <p className="text-xs text-purple-500">
                        {syncResults.invoices.skipped} skipped
                        {syncResults.invoices.errors.length > 0 && `, ${syncResults.invoices.errors.length} errors`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="clay-card rounded-2xl p-8 text-center">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">Connect to QuickBooks</h3>
              <p className="text-gray-500 mb-4">
                Link your QuickBooks Online account to sync customers and invoices automatically.
              </p>
              {hasCreds ? (
                <Button
                  onClick={handleConnect}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl px-6 py-3 inline-flex items-center gap-2 font-semibold"
                >
                  <LinkIcon className="w-4 h-4" />
                  Connect to QuickBooks
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <p className="text-sm text-orange-600">Configure API credentials above to enable connection</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Export Tab */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                Export as IIF (Desktop)
              </Button>
              <Button
                onClick={exportCustomersCSV}
                className="w-full clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-blue-600"
              >
                <Download className="w-4 h-4" />
                Export as CSV (Online)
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-3">Export {clients.length} customers</p>
          </div>

          <div className="clay-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-green-500" />
              <h3 className="font-bold text-gray-800">Invoice Export</h3>
            </div>
            <div className="space-y-3">
              <Button
                onClick={exportInvoicesIIF}
                className="w-full clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-green-600"
              >
                <Download className="w-4 h-4" />
                Export as IIF (Desktop)
              </Button>
              <Button
                onClick={exportInvoicesCSV}
                className="w-full clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-green-600"
              >
                <Download className="w-4 h-4" />
                Export as CSV (Online)
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {paidInvoices.length} paid, {unpaidInvoices.length} outstanding
            </p>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="bg-blue-50 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-700 mb-1">How it works</p>
            <ul className="text-blue-600 space-y-1">
              <li><strong>Live Sync:</strong> Connect once, then push data via QuickBooks API</li>
              <li><strong>Manual Export:</strong> Download IIF/CSV files and import them into QuickBooks</li>
            </ul>
            <a
              href="https://developer.intuit.com/app/developer/qbo/docs/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-700 hover:underline mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              QuickBooks API Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
