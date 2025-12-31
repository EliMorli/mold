import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import ClientPortalView from "../components/clients/ClientPortalView";

export default function ClientPortalPage() {
  const { user } = useAuth();

  const { data: allTests = [], isLoading: testsLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      const testList = await base44.entities.Test.list('-created_date');
      return testList.map(t => t.data ? { ...t.data, id: t.id } : t);
    },
    initialData: [],
  });

  const { data: allInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const invoiceList = await base44.entities.Invoice.list('-created_date');
      return invoiceList.map(i => i.data ? { ...i.data, id: i.id } : i);
    },
    initialData: [],
  });

  // Filter data for the current user's linked client
  const clientTests = allTests.filter(test => test.client_id === user?.linked_client_id);
  const clientInvoices = allInvoices.filter(inv => inv.client_id === user?.linked_client_id);

  if (testsLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="clay-card rounded-3xl p-8">
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!user?.linked_client_id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="clay-card rounded-3xl p-8 text-center">
          <p className="text-gray-600 mb-2">No client account linked</p>
          <p className="text-sm text-gray-500">Please contact support to link your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <ClientPortalView clientTests={clientTests} clientInvoices={clientInvoices} />
    </div>
  );
}