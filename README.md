# Élan

Backend: Firebase (Firestore + Auth + Storage). Notifications: OneSignal, sent
server-side by a Netlify Function that reads Firestore with the Firebase
Admin SDK. Supabase is fully decommissioned — nothing in this app talks to it
(the old schema/migrations are kept for reference under `_backup/supabase-era/`).

## Notification deployment
This app uses OneSignal with a Netlify Function (`netlify/functions/notify.js`)
for server-side notification delivery against Firestore.

### Deploy frontend and functions
Run:

```bash
netlify deploy --prod
```

### Deploy Firestore/Storage security rules
Rules live in `firestore.rules`/`storage.rules` at the repo root. Deploy with:

```bash
firebase deploy --only firestore:rules,storage:rules
```

Storage must be enabled once for the project via Firebase Console → Build →
Storage → Get Started before `storage:rules` can deploy or profile-photo
upload will work.

### Required environment variables
Set these in Netlify's environment (server-side only — never prefix with `VITE_`):
- `FIREBASE_SERVICE_ACCOUNT_JSON` — the full contents of a Firebase service-account key JSON (Console → Project Settings → Service Accounts → Generate new private key), as a single-line string. Grants full database access — never commit the key file, never put it in the client bundle.
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `SITE_URL` — your deployed site's origin, used to build notification deep links

Set these in the frontend env file (`.env`, safe to expose client-side — Firebase web config values are not secrets):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_ONESIGNAL_APP_ID`
- `VITE_ONESIGNAL_SAFARI_WEB_ID`
