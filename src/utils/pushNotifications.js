import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ONESIGNAL_APP_ID, ONESIGNAL_ENABLED, ONESIGNAL_SAFARI_WEB_ID } from '../config';

const ONESIGNAL_SCRIPT_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.js';

let oneSignalPromise = null;

async function loadOneSignal() {
  if (!ONESIGNAL_ENABLED) return null;
  if (oneSignalPromise) return oneSignalPromise;

  oneSignalPromise = new Promise((resolve) => {
    if (window.OneSignal) {
      resolve(window.OneSignal);
      return;
    }

    const existing = document.getElementById('onesignal-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.OneSignal), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'onesignal-sdk';
    script.src = ONESIGNAL_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.OneSignal);
    document.head.appendChild(script);
  });

  return oneSignalPromise;
}

export async function registerPushNotifications(userProfile, options = {}) {
  const uid = userProfile?.uid;
  const userDocId = userProfile?.docId || uid;
  if (!uid || !ONESIGNAL_ENABLED || !('Notification' in window)) return null;

  const OneSignal = await loadOneSignal();
  if (!OneSignal) return null;

  const shouldRequestPermission = options.requestPermission === true;
  const permission = Notification.permission === 'default'
    ? (shouldRequestPermission ? await Promise.race([
        Notification.requestPermission(),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 8000)),
      ]) : 'default')
    : Notification.permission;

  if (permission !== 'granted') return null;

  if (!window.OneSignal?.User) {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      safari_web_id: ONESIGNAL_SAFARI_WEB_ID || undefined,
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
    });
  }

  if (typeof OneSignal.Notifications?.requestPermission === 'function') {
    await OneSignal.Notifications.requestPermission();
  }

  if (OneSignal.User?.PushSubscription?.optIn) {
    await OneSignal.User.PushSubscription.optIn();
  }

  let playerId = await OneSignal.getUserId();
  if (!playerId) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    playerId = await OneSignal.getUserId();
  }

  if (!playerId) return null;

  await updateDoc(doc(db, 'users', userDocId), {
    oneSignalPlayerId: playerId,
    notificationsEnabled: true,
    notificationsUpdatedAt: serverTimestamp(),
  });

  return playerId;
}

export async function listenForForegroundNotifications() {
  if (!ONESIGNAL_ENABLED) return () => {};
  const OneSignal = await loadOneSignal();
  if (!OneSignal) return () => {};

  OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
    event.preventDefault();
    const title = event.notification.title || 'Élan';
    const body = event.notification.body || '';
    if (document.visibilityState !== 'visible' || Notification.permission !== 'granted') return;
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      data: event.notification.additionalData || {},
    });
  });

  return () => {};
}
