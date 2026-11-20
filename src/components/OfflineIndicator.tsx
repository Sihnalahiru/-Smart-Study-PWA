import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/95 to-orange-50/90 px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-md backdrop-blur-md md:bottom-5"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-700 shrink-0" aria-hidden="true" />
      <span>Offline Mode — Studying from cached files</span>
    </div>
  );
};
