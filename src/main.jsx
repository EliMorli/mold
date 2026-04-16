import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '@/App.jsx'
import '@/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is stored in localStorage (no network cost), so always consider it stale
      // and refetch when components mount. This ensures page navigation always shows
      // fresh data (e.g., going from ClientProfile back to Clients list).
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
) 