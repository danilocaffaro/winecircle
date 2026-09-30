import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { savePushSubscription, removePushSubscription } from '../services/pocketbase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export const usePushNotifications = () => {
  const { authenticated, user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    () => ('Notification' in window ? Notification.permission : 'unsupported'),
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const get = async () => {
      if (!authenticated || !('serviceWorker' in navigator)) return null;
      const registration = await navigator.serviceWorker.getRegistration();
      return await registration?.pushManager?.getSubscription() || null;
    };
    const refresh = () => { void get().catch(() => null).then((sub) => { if (active) { setSubscription(sub); setChecked(true); } }); };
    refresh();
    window.addEventListener('wc-push-change', refresh);
    return () => { active = false; window.removeEventListener('wc-push-change', refresh); };
  }, [authenticated, user?.id]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Este navegador não oferece notificações');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      toast.error('Este navegador não oferece notificações');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      toast.error('As notificações ainda não estão configuradas neste ambiente');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        return await subscribeToPush();
      } else {
        toast.error('As notificações foram bloqueadas');
        return false;
      }
    } catch (err) {
      console.error('Permission request failed:', err);
      toast.error('Não foi possível pedir permissão');
      return false;
    }
  };

  const subscribeToPush = async () => {
    if (!authenticated) return false;

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
      window.dispatchEvent(new Event('wc-push-change'));
      toast.success('Notificações ativadas');
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      toast.error('Não foi possível ativar as notificações');
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    
    try {
      await removePushSubscription();
      setSubscription(null);
      window.dispatchEvent(new Event('wc-push-change'));
      toast.success('Notificações desativadas');
    } catch (err) {
      console.error('Unsubscribe failed:', err);
    }
  };

  return {
    permission,
    subscription,
    checked,
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
  const { permission, requestPermission, subscription, checked, isSupported } = usePushNotifications();
  const { authenticated, user } = useAuth();
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const key = `wc_push_dismissed_${user?.id}`;
  let dismissed = dismissedFor === user?.id;
  try { dismissed ||= localStorage.getItem(key) === 'true'; } catch { /* optional storage */ }

  if (!authenticated || !isSupported || !checked || subscription || permission === 'denied' || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedFor(user?.id || null);
    try { localStorage.setItem(key, 'true'); } catch { /* optional storage */ }
  };

  const handleAtivar = async () => {
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
            Acompanhe seus pagamentos
          </p>
          <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', lineHeight: 1.4 }}>
            Receba um aviso quando alguém marcar um pagamento ou confirmar o recebimento.
          </p>
        </div>
        <button onClick={handleDismiss} aria-label="Fechar aviso" style={{
          background: 'none', border: 'none', padding: 4, minWidth: 44, minHeight: 44,
          cursor: 'pointer', color: 'var(--md-on-surface-variant)',
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={handleAtivar} style={{
          flex: 1, padding: '10px 16px', borderRadius: 'var(--shape-full)',
          background: 'var(--md-primary)', color: 'var(--md-on-primary)',
          border: 'none', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Ativar
        </button>
        <button onClick={handleDismiss} aria-label="Fechar aviso" style={{
          padding: '10px 16px', borderRadius: 'var(--shape-full)',
          background: 'none', color: 'var(--md-on-surface-variant)',
          border: 'none', fontSize: 14, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Mais tarde
        </button>
      </div>
    </div>
  );
};
