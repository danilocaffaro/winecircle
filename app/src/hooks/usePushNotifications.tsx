import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { savePushSubscription } from '../services/pocketbase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export const usePushNotifications = () => {
  const { authenticated } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    () => ('Notification' in window ? Notification.permission : 'unsupported'),
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);


  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Push notifications not supported');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      toast.error('Service worker not supported');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID_PUBLIC_KEY not configured');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        await subscribeToPush();
        return true;
      } else {
        toast.error('Push notifications denied');
        return false;
      }
    } catch (err) {
      console.error('Permission request failed:', err);
      toast.error('Failed to request permission');
      return false;
    }
  };

  const subscribeToPush = async () => {
    if (!authenticated) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let sub = await registration.pushManager.getSubscription();
      
      if (!sub) {
        // Create new subscription
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Save to PocketBase
      await savePushSubscription(sub);
      setSubscription(sub);
      toast.success('Push notifications enabled!');
    } catch (err) {
      console.error('Push subscription failed:', err);
      toast.error('Failed to enable push');
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      toast.success('Push notifications disabled');
    } catch (err) {
      console.error('Unsubscribe failed:', err);
    }
  };

  return {
    permission,
    subscription,
    requestPermission,
    unsubscribe,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
  };
};

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Component for push notification prompt
export const PushNotificationPrompt: React.FC = () => {
  const { permission, requestPermission, isSupported } = usePushNotifications();
  const { authenticated } = useAuth();
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem('wc_push_dismissed') === 'true'
  );

  if (!authenticated || !isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('wc_push_dismissed', 'true');
  };

  const handleEnable = async () => {
    const success = await requestPermission();
    if (success) handleDismiss();
  };

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)',
      left: 16, right: 16, zIndex: 100,
      background: 'var(--md-surface-container)',
      borderRadius: 20, padding: '16px 20px',
      border: '1px solid var(--md-outline-variant)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    }}>
      <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
        <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--md-primary)', flexShrink: 0 }}>
          notifications
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)', marginBottom: 4 }}>
            Get payment updates
          </p>
          <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', lineHeight: 1.4 }}>
            We'll notify you when someone pays you or confirms receipt.
          </p>
        </div>
        <button onClick={handleDismiss} style={{
          background: 'none', border: 'none', padding: 4,
          cursor: 'pointer', color: 'var(--md-on-surface-variant)',
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={handleEnable} style={{
          flex: 1, padding: '10px 16px', borderRadius: 'var(--shape-full)',
          background: 'var(--md-primary)', color: 'var(--md-on-primary)',
          border: 'none', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Enable
        </button>
        <button onClick={handleDismiss} style={{
          padding: '10px 16px', borderRadius: 'var(--shape-full)',
          background: 'none', color: 'var(--md-on-surface-variant)',
          border: 'none', fontSize: 14, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Maybe later
        </button>
      </div>
    </div>
  );
};
