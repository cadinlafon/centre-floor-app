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

const REGISTRATION_TIMEOUT_MS = 15000;

/** iOS/iPadOS only supports web push for a PWA added to the Home Screen —
 * a normal Safari tab will let Notification.requestPermission() resolve
 * "granted" but then hang forever trying to actually create a push
 * subscription, since the platform never provides one outside standalone
 * mode. Surface this explicitly instead of hanging on "Enabling…". */
function isIosNonStandalone() {
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as Mac
  if (!isIos) return false;
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  return !isStandalone;
}

async function completeOneSignalRegistration(userDocId) {
  const OneSignal = await loadOneSignal();
  if (!OneSignal) return null;

  if (!window.OneSignal?.User) {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      safari_web_id: ONESIGNAL_SAFARI_WEB_ID || undefined,
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
    });
  }

  // Not calling OneSignal.Notifications.requestPermission() here on purpose:
  // we've already gotten a native "granted" via Notification.requestPermission()
  // above, outside OneSignal's own tracking. Asking OneSignal to request
  // permission again — for a decision the OS already made — has been
  // observed to hang indefinitely on iOS Safari instead of resolving.

  if (OneSignal.User?.PushSubscription?.optIn) {
    await OneSignal.User.PushSubscription.optIn();
  }

  // OneSignal.getUserId() is a leftover v1 SDK method name; the actual v16
  // API exposes the subscription id as a plain property, with getId() as a
  // fallback on some SDK builds. Try each rather than assuming one shape.
  function readPlayerId() {
    return OneSignal.User?.PushSubscription?.id || null;
  }

  let playerId = readPlayerId();
  if (!playerId && typeof OneSignal.User?.PushSubscription?.getId === 'function') {
    playerId = await OneSignal.User.PushSubscription.getId();
  }
  if (!playerId) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    playerId = readPlayerId();
  }

  if (!playerId) return null;

  await updateDoc(doc(db, 'users', userDocId), {
    oneSignalPlayerId: playerId,
    notificationsEnabled: true,
    notificationsUpdatedAt: serverTimestamp(),
  });

  return playerId;
}

export async function registerPushNotifications(userProfile, options = {}) {
  const uid = userProfile?.uid;
  const userDocId = userProfile?.docId || uid;
  if (!uid || !ONESIGNAL_ENABLED || !('Notification' in window)) return null;

  const shouldRequestPermission = options.requestPermission === true;

  if (isIosNonStandalone()) {
    // Only bother the user with this when they explicitly asked to enable
    // notifications — the passive, silent re-registration that runs on every
    // page load should just no-op quietly on a platform that can't support it.
    if (!shouldRequestPermission) return null;
    throw new Error('On iPhone/iPad, add Élan to your Home Screen first (Share → Add to Home Screen), then enable notifications from there — Safari alone can\'t receive push notifications on iOS.');
  }

  // Ask the browser's real, native permission dialog FIRST — before loading
  // the OneSignal SDK script or doing anything else async. Browsers only
  // reliably show this prompt as a direct continuation of the user's click;
  // inserting an awaited network fetch (loadOneSignal below) ahead of it can
  // burn through the "user activation" window and cause the call to resolve
  // silently instead of actually showing the system dialog.
  let permission = Notification.permission;
  if (permission === 'default') {
    if (!shouldRequestPermission) return null;
    permission = await Promise.race([
      Notification.requestPermission(),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 8000)),
    ]);
  }

  if (permission !== 'granted') return null;

  // However OneSignal's own registration behaves on a given device, never
  // let it hang the UI open indefinitely — surface a real error instead.
  return Promise.race([
    completeOneSignalRegistration(userDocId),
    new Promise((_, reject) => setTimeout(
      () => reject(new Error("Couldn't finish enabling notifications — please try again.")),
      REGISTRATION_TIMEOUT_MS
    )),
  ]);
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
