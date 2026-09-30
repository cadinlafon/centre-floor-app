export { auth, db, storage } from './lib/firebase';

// The OneSignal REST API key is a private, server-side secret — it must
// never be prefixed with VITE_ or shipped in the client bundle. It lives
// only in the Netlify Function's environment (ONESIGNAL_REST_API_KEY).
export const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '';
export const ONESIGNAL_SAFARI_WEB_ID = import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID || '';
export const ONESIGNAL_ENABLED = Boolean(ONESIGNAL_APP_ID);
