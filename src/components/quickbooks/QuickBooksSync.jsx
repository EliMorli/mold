import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Shield,
  Copy,
  Hash,
  TestTube,
  Eye,
  Database,
  RotateCcw,
  ArrowDownCircle,
  ArrowUpCircle,
  Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as QB from "@/services/quickbooks";
import { reloadDemoData } from "@/api/base44Client";

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
export default function QuickBooksSync({ clients = [], invoices = [], isLoading = false }) {
  const queryClient = useQueryClient();
  const [connectionInfo, setConnectionInfo] = useState(QB.getConnectionInfo());
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncResults, setSyncResults] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('sync'); // 'sync' | 'export'

  const hasCreds = QB.hasCredentials();
  const hasData = clients.length > 0 || invoices.length > 0;
  const isEmpty = !isLoading && !hasData;

  // Refresh data by invalidating React Query cache
  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      ]);
      toast.success('Data refreshed');
    } catch (e) {
      toast.error('Refresh failed: ' + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Force reload demo data into localStorage + refresh queries
  const handleReloadDemoData = async () => {
    if (!window.confirm('This will overwrite any custom records with the original demo data. Continue?')) {
      return;
    }
    setRefreshing(true);
    try {
      const ok = reloadDemoData();
      if (!ok) throw new Error('Failed to reload demo data');

      // Invalidate all relevant queries so they refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['tests'] }),
        queryClient.invalidateQueries({ queryKey: ['technicians'] }),
        queryClient.invalidateQueries({ queryKey: ['labs'] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      ]);
      toast.success('Demo data reloaded successfully');
    } catch (e) {
      toast.error('Reload failed: ' + e.message);
    } finally {
      setRefreshing(false);
    }
  };

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
      setTestResult(null);
      toast.success('Disconnected from QuickBooks. Next connect will prompt for company selection.');
    } catch (e) {
      // Fallback: clear local tokens even if revoke fails
      QB.clearTokens();
      setConnectionInfo({ isConnected: false });
      setSyncResults(null);
      setTestResult(null);
      toast.success('Disconnected locally');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const info = await QB.testConnection();
      setTestResult({ success: true, info });
      // Refresh connection info to show updated company name
      setConnectionInfo(QB.getConnectionInfo());
      toast.success(`Connected to: ${info.CompanyName}`);
    } catch (e) {
      setTestResult({ success: false, error: e.message });
      toast.error(`Test failed: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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

  // ---------- Pull from QuickBooks handlers ----------
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const invalidateAppQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['clients'] }),
      queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    ]);
  };

  const handlePullAll = async () => {
    setImporting(true);
    setImportResults(null);
    try {
      const results = await QB.performFullImport();
      setImportResults(results);
      await invalidateAppQueries();
      const total = results.customers.imported + results.invoices.imported;
      const errs = results.customers.errors.length + results.invoices.errors.length;
      if (errs === 0) toast.success(`Imported ${total} records from QuickBooks`);
      else toast.message(`Imported ${total} records, ${errs} errors`);
    } catch (e) {
      toast.error(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handlePullCustomers = async () => {
    setImporting(true);
    try {
      const results = await QB.importCustomersFromQB();
      await invalidateAppQueries();
      toast.success(`Imported ${results.imported}, skipped ${results.skipped} customers`);
    } catch (e) {
      toast.error(e.message || 'Failed to import customers');
    } finally {
      setImporting(false);
    }
  };

  const handlePullInvoices = async () => {
    setImporting(true);
    try {
      const results = await QB.importInvoicesFromQB();
      await invalidateAppQueries();
      toast.success(`Imported ${results.imported}, skipped ${results.skipped} invoices`);
    } catch (e) {
      toast.error(e.message || 'Failed to import invoices');
    } finally {
      setImporting(false);
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
              {/* Connection Details Panel */}
              <div className="rounded-2xl p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Connected To</p>
                      <p className="text-lg font-bold text-gray-800">
                        {connectionInfo.companyName || 'Loading...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="clay-button rounded-xl px-3 py-2 text-sm flex items-center gap-1.5 text-blue-600"
                    >
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                      Test Connection
                    </Button>
                    <a
                      href={connectionInfo.environment === 'production'
                        ? 'https://qbo.intuit.com/app/homepage'
                        : 'https://app.sandbox.qbo.intuit.com/app/homepage'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="clay-button rounded-xl px-3 py-2 text-sm flex items-center gap-1.5 text-purple-600 hover:scale-[1.02] transition-transform"
                    >
                      <Eye className="w-4 h-4" />
                      Open in QuickBooks
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white/70 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                      <Hash className="w-3 h-3" />
                      Realm ID (Company ID)
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-gray-800 break-all">{connectionInfo.realmId}</code>
                      <button
                        onClick={() => copyToClipboard(connectionInfo.realmId, 'Realm ID')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/70 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                      <Shield className="w-3 h-3" />
                      Environment
                    </div>
                    <Badge className={`${
                      connectionInfo.environment === 'production'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    } rounded-lg px-2 py-0.5 text-xs uppercase font-bold`}>
                      {connectionInfo.environment || 'sandbox'}
                    </Badge>
                  </div>

                  <div className="bg-white/70 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                      <CheckCircle className="w-3 h-3" />
                      Status
                    </div>
                    <p className="text-sm font-semibold text-green-700">
                      Active connection
                    </p>
                  </div>
                </div>

                {/* Test Result */}
                {testResult && (
                  <div className={`mt-3 rounded-xl p-3 ${
                    testResult.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
                  }`}>
                    {testResult.success ? (
                      <div className="text-sm">
                        <p className="font-semibold text-green-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" />
                          Connection verified
                        </p>
                        <div className="mt-1 text-green-700 text-xs space-y-0.5">
                          <p><strong>Company:</strong> {testResult.info.CompanyName}</p>
                          {testResult.info.LegalName && <p><strong>Legal Name:</strong> {testResult.info.LegalName}</p>}
                          {testResult.info.Country && <p><strong>Country:</strong> {testResult.info.Country}</p>}
                          {testResult.info.FiscalYearStartMonth && <p><strong>Fiscal Year Start:</strong> {testResult.info.FiscalYearStartMonth}</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-red-800 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        Test failed: {testResult.error}
                      </p>
                    )}
                  </div>
                )}

                {/* Sandbox notice */}
                {connectionInfo.environment !== 'production' && (
                  <div className="mt-3 text-xs text-blue-700 bg-blue-50 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Sandbox mode:</strong> Synced data goes to your sandbox company.
                      To view it, click <strong>"Open in QuickBooks"</strong> above and look for customers/invoices in the sandbox company.
                      You may need to log in to <a href="https://developer.intuit.com/app/developer/dashboard" target="_blank" rel="noopener noreferrer" className="underline">developer.intuit.com</a> first.
                    </div>
                  </div>
                )}
              </div>

              {/* Loading state */}
              {isLoading && (
                <div className="rounded-2xl p-6 bg-blue-50 border-2 border-blue-200 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-800">Loading app data...</p>
                    <p className="text-blue-600">Fetching customers and invoices to sync.</p>
                  </div>
                </div>
              )}

              {/* Empty data warning */}
              {isEmpty && (
                <div className="rounded-2xl p-5 bg-amber-50 border-2 border-amber-300">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900 text-lg">No Data to Sync</h3>
                      <p className="text-sm text-amber-800 mt-1">
                        Your app has <strong>0 customers</strong> and <strong>0 invoices</strong>. There's nothing to push to QuickBooks yet.
                      </p>
                      <p className="text-xs text-amber-700 mt-2">
                        This can happen if the app data hasn't loaded yet, or if the local cache was cleared.
                        Try refreshing first. If that doesn't help, click "Reload Demo Data" to restore the sample records.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleRefreshData}
                      disabled={refreshing}
                      className="clay-button rounded-xl px-4 py-2 flex items-center gap-2 text-blue-600 font-semibold disabled:opacity-50"
                    >
                      {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      Refresh Data
                    </Button>
                    <Button
                      onClick={handleReloadDemoData}
                      disabled={refreshing}
                      className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2 flex items-center gap-2 font-semibold disabled:opacity-50"
                    >
                      {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                      Reload Demo Data
                    </Button>
                  </div>
                </div>
              )}

              <div className="clay-card rounded-2xl p-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-green-500" />
                    Sync to QuickBooks
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{clients.length} customers · {invoices.length} invoices ready</span>
                    <button
                      onClick={handleRefreshData}
                      disabled={refreshing}
                      className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      title="Refresh data from app"
                    >
                      {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={handleSyncAll}
                    disabled={syncing || isEmpty}
                    title={isEmpty ? 'No data to sync' : ''}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                  >
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync All
                  </Button>
                  <Button
                    onClick={handleSyncCustomers}
                    disabled={syncing || clients.length === 0}
                    title={clients.length === 0 ? 'No customers to sync' : ''}
                    className="clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-blue-600 disabled:opacity-50"
                  >
                    <Users className="w-4 h-4" />
                    Sync Customers ({clients.length})
                  </Button>
                  <Button
                    onClick={handleSyncInvoices}
                    disabled={syncing || invoices.length === 0}
                    title={invoices.length === 0 ? 'No invoices to sync' : ''}
                    className="clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-purple-600 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    Sync Invoices ({invoices.length})
                  </Button>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  Creates new records in QuickBooks. Duplicates (by name / invoice #) are skipped.
                </p>
              </div>

              {/* Pull FROM QuickBooks */}
              <div className="clay-card rounded-2xl p-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <ArrowDownCircle className="w-5 h-5 text-blue-500" />
                    Pull from QuickBooks
                  </h3>
                  <span className="text-xs text-gray-500">
                    Import customers / invoices created in QuickBooks into this app
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={handlePullAll}
                    disabled={importing}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
                    Pull All
                  </Button>
                  <Button
                    onClick={handlePullCustomers}
                    disabled={importing}
                    className="clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-blue-600 disabled:opacity-50"
                  >
                    <Users className="w-4 h-4" />
                    Pull Customers
                  </Button>
                  <Button
                    onClick={handlePullInvoices}
                    disabled={importing}
                    className="clay-button rounded-xl py-3 flex items-center justify-center gap-2 text-purple-600 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    Pull Invoices
                  </Button>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  Fetches all customers/invoices from QuickBooks and creates them in the app. Duplicates (by QB ID or name / invoice #) are skipped.
                </p>
              </div>

              {/* Import Results */}
              {importResults && (
                <div className="clay-card rounded-2xl p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <ArrowDownCircle className="w-5 h-5 text-blue-500" />
                      Last Import Results
                    </h3>
                    <p className="text-xs text-gray-500">
                      Pulled from: <strong>{connectionInfo.companyName}</strong>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-cyan-50 rounded-xl p-3">
                      <p className="text-sm text-cyan-600 font-medium">Customers</p>
                      <p className="text-xl font-bold text-cyan-700">{importResults.customers.imported} imported</p>
                      <p className="text-xs text-cyan-500">
                        {importResults.customers.skipped} skipped
                        {importResults.customers.errors.length > 0 && `, ${importResults.customers.errors.length} errors`}
                      </p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3">
                      <p className="text-sm text-indigo-600 font-medium">Invoices</p>
                      <p className="text-xl font-bold text-indigo-700">{importResults.invoices.imported} imported</p>
                      <p className="text-xs text-indigo-500">
                        {importResults.invoices.skipped} skipped
                        {importResults.invoices.errors.length > 0 && `, ${importResults.invoices.errors.length} errors`}
                      </p>
                    </div>
                  </div>

                  {(importResults.customers.errors.length > 0 || importResults.invoices.errors.length > 0) && (
                    <details className="mt-3">
                      <summary className="text-xs text-red-600 cursor-pointer font-medium">
                        View error details ({importResults.customers.errors.length + importResults.invoices.errors.length})
                      </summary>
                      <div className="mt-2 bg-red-50 rounded-xl p-3 text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                        {importResults.customers.errors.map((err, i) => (
                          <div key={`c-${i}`}><strong>Customer "{err.name}":</strong> {err.error}</div>
                        ))}
                        {importResults.invoices.errors.map((err, i) => (
                          <div key={`i-${i}`}><strong>Invoice #{err.number}:</strong> {err.error}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {syncResults && (
                <div className="clay-card rounded-2xl p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h3 className="font-bold text-gray-800">Last Sync Results</h3>
                    <p className="text-xs text-gray-500">
                      Synced to: <strong>{connectionInfo.companyName}</strong>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-sm text-blue-600 font-medium">Customers</p>
                      <p className="text-xl font-bold text-blue-700">{syncResults.customers.created} created</p>
                      <p className="text-xs text-blue-500">
                        {syncResults.customers.skipped} skipped
                        {syncResults.customers.errors.length > 0 && `, ${syncResults.customers.errors.length} errors`}
                      </p>
                      {syncResults.customers.created > 0 && (
                        <a
                          href={connectionInfo.environment === 'production'
                            ? 'https://qbo.intuit.com/app/customers'
                            : 'https://app.sandbox.qbo.intuit.com/app/customers'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View in QuickBooks
                        </a>
                      )}
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3">
                      <p className="text-sm text-purple-600 font-medium">Invoices</p>
                      <p className="text-xl font-bold text-purple-700">{syncResults.invoices.created} created</p>
                      <p className="text-xs text-purple-500">
                        {syncResults.invoices.skipped} skipped
                        {syncResults.invoices.errors.length > 0 && `, ${syncResults.invoices.errors.length} errors`}
                      </p>
                      {syncResults.invoices.created > 0 && (
                        <a
                          href={connectionInfo.environment === 'production'
                            ? 'https://qbo.intuit.com/app/invoices'
                            : 'https://app.sandbox.qbo.intuit.com/app/invoices'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:underline mt-2 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View in QuickBooks
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Show error details if any */}
                  {(syncResults.customers.errors.length > 0 || syncResults.invoices.errors.length > 0) && (
                    <details className="mt-3">
                      <summary className="text-xs text-red-600 cursor-pointer font-medium">
                        View error details ({syncResults.customers.errors.length + syncResults.invoices.errors.length})
                      </summary>
                      <div className="mt-2 bg-red-50 rounded-xl p-3 text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                        {syncResults.customers.errors.map((err, i) => (
                          <div key={`c-${i}`}>
                            <strong>Customer "{err.name}":</strong> {err.error}
                          </div>
                        ))}
                        {syncResults.invoices.errors.map((err, i) => (
                          <div key={`i-${i}`}>
                            <strong>Invoice #{err.number}:</strong> {err.error}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
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
