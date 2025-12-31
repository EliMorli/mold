import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, X, FlaskConical, Users, Receipt, Wallet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState("");

  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list(),
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
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

  // Search across all entities
  const searchResults = query.length > 0 ? {
    tests: tests.filter(t => 
      t.test_number?.toLowerCase().includes(query.toLowerCase()) ||
      t.client_name?.toLowerCase().includes(query.toLowerCase()) ||
      t.property_address?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5),
    clients: clients.filter(c =>
      c.name?.toLowerCase().includes(query.toLowerCase()) ||
      c.email?.toLowerCase().includes(query.toLowerCase()) ||
      c.phone?.includes(query)
    ).slice(0, 5),
    invoices: invoices.filter(i =>
      i.invoice_number?.toLowerCase().includes(query.toLowerCase()) ||
      i.client_name?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5),
    expenses: expenses.filter(e =>
      e.description?.toLowerCase().includes(query.toLowerCase()) ||
      e.vendor?.toLowerCase().includes(query.toLowerCase()) ||
      e.category?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5)
  } : { tests: [], clients: [], invoices: [], expenses: [] };

  const totalResults = searchResults.tests.length + searchResults.clients.length + 
                      searchResults.invoices.length + searchResults.expenses.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="clay-card rounded-3xl p-6 w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-6 h-6 text-purple-600" />
          <Input
            autoFocus
            placeholder="Search tests, clients, invoices, expenses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="clay-button rounded-2xl border-0 text-lg"
          />
          <button onClick={onClose} className="clay-button rounded-2xl p-2">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {query.length > 0 && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {totalResults === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No results found for "{query}"</p>
              </div>
            )}

            {searchResults.tests.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-gray-800">Tests ({searchResults.tests.length})</h3>
                </div>
                <div className="space-y-2">
                  {searchResults.tests.map(test => (
                    <a
                      key={test.id}
                      href={`${createPageUrl('TestProfile')}?id=${test.id}`}
                      onClick={onClose}
                      className="clay-button rounded-2xl p-3 flex items-center justify-between hover:scale-[1.01] transition-transform"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{test.test_number}</p>
                        <p className="text-sm text-gray-600">{test.client_name} • {test.property_address}</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700 rounded-lg">
                        {test.status}
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {searchResults.clients.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-gray-800">Clients ({searchResults.clients.length})</h3>
                </div>
                <div className="space-y-2">
                  {searchResults.clients.map(client => (
                    <a
                      key={client.id}
                      href={`${createPageUrl('ClientProfile')}?id=${client.id}`}
                      onClick={onClose}
                      className="clay-button rounded-2xl p-3 flex items-center justify-between hover:scale-[1.01] transition-transform"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.email} • {client.phone}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 rounded-lg">
                        {client.client_type}
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {searchResults.invoices.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-4 h-4 text-green-600" />
                  <h3 className="font-bold text-gray-800">Invoices ({searchResults.invoices.length})</h3>
                </div>
                <div className="space-y-2">
                  {searchResults.invoices.map(invoice => (
                    <div
                      key={invoice.id}
                      onClick={() => {
                        window.location.href = createPageUrl('Invoices');
                        onClose();
                      }}
                      className="clay-button rounded-2xl p-3 flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-600">{invoice.client_name} • ${invoice.total?.toLocaleString()}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 rounded-lg">
                        {invoice.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.expenses.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-4 h-4 text-red-600" />
                  <h3 className="font-bold text-gray-800">Expenses ({searchResults.expenses.length})</h3>
                </div>
                <div className="space-y-2">
                  {searchResults.expenses.map(expense => (
                    <div
                      key={expense.id}
                      onClick={() => {
                        window.location.href = createPageUrl('Expenses');
                        onClose();
                      }}
                      className="clay-button rounded-2xl p-3 flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{expense.description || expense.category}</p>
                        <p className="text-sm text-gray-600">{expense.vendor} • {expense.category}</p>
                      </div>
                      <span className="text-gray-700 font-semibold">${expense.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {query.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Start typing to search across all data...</p>
            <p className="text-xs text-gray-400 mt-2">Tests • Clients • Invoices • Expenses</p>
          </div>
        )}
      </div>
    </div>
  );
}