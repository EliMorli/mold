import { useState, useEffect } from 'react';
import { Download, X, Smartphone, RefreshCw, WifiOff, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';

export function PWAInstallBanner() {
  const {
    isInstallable,
    isInstalled,
    isOffline,
    updateAvailable,
    installApp,
    updateApp,
    requestNotificationPermission
  } = usePWA();

  const [dismissed, setDismissed] = useState(false);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  // Show offline toast
  useEffect(() => {
    if (isOffline) {
      setShowOfflineToast(true);
    } else {
      const timer = setTimeout(() => setShowOfflineToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  // Check if banner was previously dismissed
  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (wasDismissed) {
      const dismissedAt = new Date(wasDismissed);
      const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', new Date().toISOString());
  };

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) {
      // Request notification permission after install
      await requestNotificationPermission();
    }
  };

  // Update available banner
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
        <div className="clay-card rounded-2xl p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Update Available</p>
              <p className="text-sm text-white/80">
                A new version of JohnMold is ready.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={updateApp}
              className="flex-1 bg-white text-purple-600 hover:bg-white/90 rounded-xl font-semibold"
            >
              Update Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Offline indicator
  if (showOfflineToast && isOffline) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
        <div className="clay-card rounded-2xl p-4 bg-orange-500 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">You're Offline</p>
              <p className="text-xs text-white/80">
                Some features may be limited
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Back online indicator
  if (showOfflineToast && !isOffline) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
        <div className="clay-card rounded-2xl p-4 bg-green-500 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 flex-shrink-0" />
            <p className="font-bold text-sm">Back Online</p>
          </div>
        </div>
      </div>
    );
  }

  // Install banner
  if (isInstallable && !isInstalled && !dismissed) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
        <div className="clay-card rounded-2xl p-4 shadow-xl border border-purple-200 bg-white">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 pr-4">
              <p className="font-bold text-gray-800">Install JohnMold</p>
              <p className="text-sm text-gray-500 mt-1">
                Install the app for faster access and offline support
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleDismiss}
              className="flex-1 clay-button rounded-xl py-2 text-gray-600"
            >
              Not Now
            </Button>
            <Button
              onClick={handleInstall}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl py-2 font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Offline indicator component for the header
export function OfflineIndicator() {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="bg-orange-500 text-white text-center py-1 text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span>You're offline - Some features may be limited</span>
    </div>
  );
}

export default PWAInstallBanner;
