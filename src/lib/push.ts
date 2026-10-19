import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { supabase } from '$lib/supabase';

function decodeBase64Url(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function encodeBase64Url(value: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function enablePushNotifications() {
  if (!browser || !supabase) return { error: 'Supabase is not configured.' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { error: 'Push notifications are not supported in this browser.' };
  }
  if (!env.PUBLIC_VAPID_PUBLIC_KEY) return { error: 'Push notifications are not configured yet.' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { error: 'Notification permission was not granted.' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sign in before enabling notifications.' };

  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(env.PUBLIC_VAPID_PUBLIC_KEY)
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return { error: 'Could not read the push subscription.' };

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth
  }, { onConflict: 'user_id,endpoint' });

  return { error: error?.message ?? null };
}

export async function getPushStatus() {
  if (!browser || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported' as const;
  if (Notification.permission === 'denied') return 'denied' as const;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? 'enabled' as const : 'idle' as const;
}
