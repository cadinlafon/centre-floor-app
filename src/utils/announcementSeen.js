export const ANNOUNCEMENTS_SEEN_EVENT = 'centre-floor-announcements-seen';

export function announcementSeenKey(uid) {
  return `centre-floor:announcements-seen:${uid || 'guest'}`;
}

export function getSeenAnnouncementId(uid) {
  try {
    return window.localStorage.getItem(announcementSeenKey(uid));
  } catch {
    return null;
  }
}

export function markAnnouncementSeen(uid, announcementId) {
  if (!announcementId) return;

  try {
    window.localStorage.setItem(announcementSeenKey(uid), announcementId);
  } catch {
    // The visual badge is best-effort if localStorage is unavailable.
  }

  window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_SEEN_EVENT, {
    detail: { uid, announcementId },
  }));
}
