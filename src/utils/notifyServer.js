import { auth } from '../lib/firebase';

function getNotifyUrl() {
  const fromEnv = import.meta.env.VITE_NOTIFY_FUNCTION_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  if (typeof window !== 'undefined') {
    const fromWindow = window.__NETLIFY_FUNCTION_URL__;
    if (typeof fromWindow === 'string' && fromWindow.trim()) return fromWindow.trim();
  }
  return '/.netlify/functions/notify';
}

export async function triggerNotification(kind, payload) {
  try {
    const url = getNotifyUrl();
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken || ''}`,
      },
      body: JSON.stringify({ kind, payload }),
    });

    const text = await response.text();
    if (!response.ok) {
      const details = text || `Request failed with status ${response.status}`;
      throw new Error(details);
    }

    return { ok: true, body: text };
  } catch (error) {
    console.error(`Failed to send notification (${kind})`, error);
    return { ok: false, error: error.message };
  }
}
