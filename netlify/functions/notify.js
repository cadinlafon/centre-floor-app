import admin from 'firebase-admin';

const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';
const SITE_URL = process.env.SITE_URL || process.env.URL || '';

const ROOM_LABELS = {
  'class-chat': 'Class Chat',
  'mon-wed': 'Mon / Wed',
  'tue-thu': 'Tue / Thu',
};

const ROOM_PATHS = {
  'class-chat': '/class-chat',
  'mon-wed': '/mon-wed',
  'tue-thu': '/tue-thu',
};

function getFirestore() {
  if (!FIREBASE_SERVICE_ACCOUNT_JSON) return null;
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON)),
    });
  }
  return admin.firestore();
}

function compactBody(text, maxLength = 120) {
  if (!text) return '';
  const singleLine = String(text).replace(/\s+/g, ' ').trim();
  return singleLine.length > maxLength
    ? `${singleLine.slice(0, maxLength - 1)}...`
    : singleLine;
}

function getOneSignalPlayerIds(user) {
  const ids = [];
  if (typeof user?.oneSignalPlayerId === 'string' && user.oneSignalPlayerId.trim()) {
    ids.push(user.oneSignalPlayerId.trim());
  }
  if (Array.isArray(user?.oneSignalPlayerIds)) {
    user.oneSignalPlayerIds.forEach((value) => {
      if (typeof value === 'string' && value.trim()) ids.push(value.trim());
    });
  }
  return [...new Set(ids)];
}

async function getApprovedUsers(db) {
  const snap = await db.collection('users').where('status', '==', 'approved').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getAdminUsers(db) {
  const snap = await db.collection('users').where('role', 'in', ['admin', 'superadmin']).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Global on/off switches an admin sets from /admin/notification-settings.
 * A missing doc or missing field defaults to enabled (matches prior behavior
 * before these toggles existed). */
async function getNotificationTypeSettings(db) {
  const snap = await db.collection('system_settings').doc('notificationTypes').get();
  return snap.exists ? snap.data() : {};
}
function isTypeEnabled(settings, key) {
  return settings[key] !== false;
}

function userCanReceiveRoom(user, room) {
  if (room === 'class-chat') return true;
  if (room === 'mon-wed') return user.class === 'monwed' || user.class === 'both';
  if (room === 'tue-thu') return user.class === 'tuethu' || user.class === 'both';
  return false;
}

async function sendOneSignal(users, notification, data = {}) {
  const playerIds = [];
  users.forEach((user) => {
    getOneSignalPlayerIds(user).forEach((playerId) => playerIds.push(playerId));
  });

  const uniqueIds = [...new Set(playerIds)];
  if (uniqueIds.length === 0 || !ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return { ok: false, reason: 'missing-recipients-or-config' };
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: uniqueIds,
    headings: { en: notification.title || 'Élan' },
    contents: { en: notification.body || '' },
    data: { ...data, type: data.type || 'general' },
  };

  if (data.path && SITE_URL) payload.url = `${SITE_URL}${data.path}`;

  const response = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, body: text };
}

/** Resolve the caller's user profile from their Firebase ID token, so we
 * never trust a client-supplied identity for who's allowed to trigger what. */
async function getCallerUser(db, event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch {
    return null;
  }

  const profileSnap = await db.collection('users').doc(decoded.uid).get();
  return profileSnap.exists
    ? { ...profileSnap.data(), id: decoded.uid, authId: decoded.uid }
    : { id: decoded.uid, authId: decoded.uid };
}

// The frontend is served from Firebase Hosting (a different origin than this
// Netlify function), so every response needs CORS headers or the browser
// will block it even though the request itself succeeds. The POST body is
// JSON with a custom Authorization header, so the browser also sends an
// OPTIONS preflight first — handled in the exported `handler` wrapper below.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function handleRequest(event) {
  const db = getFirestore();
  if (!db) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Notification service is not configured.' }) };
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }) };
  }

  const { kind, payload } = body;
  if (!kind || !payload) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing kind or payload' }) };
  }

  try {
    // 'access-request' is submitted by an anonymous visitor who doesn't have
    // an account yet — every other kind requires a real signed-in caller.
    const caller = await getCallerUser(db, event);
    if (!caller && kind !== 'access-request') {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) };
    }

    const settings = await getNotificationTypeSettings(db);
    function disabled() {
      return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'notification-type-disabled' }) };
    }

    if (kind === 'announcement') {
      if (!isTypeEnabled(settings, 'announcement')) return disabled();
      const users = (await getApprovedUsers(db)).filter((user) => user.id !== payload.createdBy);
      const result = await sendOneSignal(users, {
        title: payload.title || 'New announcement',
        body: compactBody(payload.body),
      }, {
        type: 'announcement',
        announcementId: payload.announcementId,
        path: '/announcement',
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    if (kind === 'class-message') {
      const typeKey = payload.room === 'class-chat' ? 'classChat' : 'ownClass';
      if (!isTypeEnabled(settings, typeKey)) return disabled();
      const senderId = payload.senderId || '';
      const users = (await getApprovedUsers(db)).filter((user) => (
        user.id !== senderId && userCanReceiveRoom(user, payload.room)
      ));
      const roomLabel = payload.roomTitle || ROOM_LABELS[payload.room] || 'Class Chat';
      const result = await sendOneSignal(users, {
        title: `${payload.senderName || 'Someone'} in ${roomLabel}`,
        body: compactBody(payload.text),
      }, {
        type: 'class-message',
        room: payload.room,
        messageId: payload.messageId,
        senderId,
        path: ROOM_PATHS[payload.room] || '/class-chat',
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    if (kind === 'access-request') {
      if (!isTypeEnabled(settings, 'accessRequest')) return disabled();
      const users = await getAdminUsers(db);
      const result = await sendOneSignal(users, {
        title: 'New access request',
        body: `${payload.name || 'A new user'} is requesting access.`,
      }, {
        type: 'access-request',
        requestId: payload.requestId,
        path: '/admin/access',
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    if (kind === 'password-set') {
      if (!isTypeEnabled(settings, 'inviteCompleted')) return disabled();
      const users = await getAdminUsers(db);
      const result = await sendOneSignal(users, {
        title: 'Password setup complete',
        body: `${payload.name || payload.email || 'A user'} finished setting up their account.`,
      }, {
        type: 'password-set',
        userId: payload.userId,
        path: '/admin/users',
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    if (kind === 'class-change-resolved') {
      if (!isTypeEnabled(settings, 'classChangeResolved')) return disabled();
      const targetSnap = await db.collection('users').doc(payload.userId).get();
      if (!targetSnap.exists) {
        return { statusCode: 404, body: JSON.stringify({ ok: false, error: 'User not found' }) };
      }
      const target = { id: targetSnap.id, ...targetSnap.data() };
      const result = await sendOneSignal([target], {
        title: payload.approved ? 'Class change approved' : 'Class change denied',
        body: payload.approved
          ? `You've been moved to ${payload.requestedClassLabel || 'your new class'}.`
          : `Your request to move to ${payload.requestedClassLabel || 'a new class'} was denied.`,
      }, {
        type: 'class-change-resolved',
        path: '/account',
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    if (kind === 'bug-feature-submitted') {
      if (!isTypeEnabled(settings, 'bugOrFeatureSubmitted')) return disabled();
      const users = await getAdminUsers(db);
      const isBug = payload.kind === 'bug';
      const result = await sendOneSignal(users, {
        title: isBug ? 'New bug report' : 'New feature suggestion',
        body: `${payload.authorName || 'A user'}: ${compactBody(payload.title)}`,
      }, {
        type: 'bug-feature-submitted',
        path: '/report',
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    if (kind === 'account-request-submitted') {
      if (!isTypeEnabled(settings, 'classChangeOrRemovalSubmitted')) return disabled();
      const users = await getAdminUsers(db);
      const isRemoval = payload.requestType === 'account-removal';
      const result = await sendOneSignal(users, {
        title: isRemoval ? 'Account removal requested' : 'Class change requested',
        body: isRemoval
          ? `${payload.name || 'A user'} asked to be unregistered.`
          : `${payload.name || 'A user'} requested a class change.`,
      }, {
        type: 'account-request-submitted',
        path: isRemoval ? '/admin/users' : '/admin/users',
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    if (kind === 'test') {
      if (!['admin', 'superadmin'].includes(caller.role)) {
        return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Only admins can send test notifications.' }) };
      }
      const targetSnap = await db.collection('users').doc(payload.userId).get();
      if (!targetSnap.exists) {
        return { statusCode: 404, body: JSON.stringify({ ok: false, error: 'User not found' }) };
      }
      const target = { id: targetSnap.id, ...targetSnap.data() };
      const result = await sendOneSignal([target], {
        title: payload.title || 'Test notification',
        body: payload.body || 'This is a test notification from Élan.',
      }, {
        type: 'test',
        path: '/account',
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Unsupported kind' }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  const result = await handleRequest(event);
  return { ...result, headers: { ...(result.headers || {}), ...CORS_HEADERS } };
}

export default handler;
