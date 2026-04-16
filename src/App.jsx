import { useEffect } from 'react'
import { toast, Toaster as SonnerToaster } from 'sonner'
import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { initQuickBooksAutoSync } from '@/services/quickbooksAutoSync'
import { initAuditLog } from '@/services/auditLog'

function App() {
  // Surface persistence errors (e.g., localStorage quota exceeded) to the user
  useEffect(() => {
    initQuickBooksAutoSync();
    initAuditLog();

    const handler = (e) => {
      toast.error('Failed to save data', {
        description: e.detail?.error || 'Storage may be full. Try clearing old data.',
      });
    };
    window.addEventListener('base44:save-error', handler);
    return () => window.removeEventListener('base44:save-error', handler);
  }, []);

  return (
    <>
      <Pages />
      <Toaster />
      <SonnerToaster position="top-right" richColors closeButton />
    </>
  )
}

export default App