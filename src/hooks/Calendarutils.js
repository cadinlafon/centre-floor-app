const CALENDAR_ID = '9595cc2ed11dbee0d290750537c7cf020f4bbce20c0fdcec66d74aaa18868313@group.calendar.google.com';
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;
const CLASS_DURATION_MINUTES = 60;

/**
 * Fetches upcoming events from the public Google Calendar.
 * Returns events from now through the next 7 days, sorted by start time.
 */
export async function fetchUpcomingEvents() {
  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    key: API_KEY,
    timeMin: now.toISOString(),
    timeMax: sevenDaysOut.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '10',
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Calendar fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Fetches events that may have started recently (to catch "in progress" classes).
 * Looks back a few hours so we don't miss a class that's currently happening.
 */
export async function fetchRecentAndUpcomingEvents() {
  const now = new Date();
  const lookBack = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hrs back
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    key: API_KEY,
    timeMin: lookBack.toISOString(),
    timeMax: sevenDaysOut.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '15',
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Calendar fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Formats a day name from a date.
 */
function dayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Formats a time like "6:00" (no AM/PM, matches Cadin's examples — adjust if needed)
 */
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Given the list of events, figures out the current class status:
 * - 'before'   → class hasn't started yet today/soon
 * - 'during'   → class is currently in progress
 * - 'none'     → no class today/soon, show next upcoming
 *
 * Returns a human-readable status object.
 */
export function getClassStatus(events) {
  const now = new Date();

  // Look at each event, check if "now" falls within [start, start + duration]
  for (const event of events) {
    const startStr = event.start?.dateTime || event.start?.date;
    if (!startStr) continue;

    const start = new Date(startStr);
    const end = new Date(start.getTime() + CLASS_DURATION_MINUTES * 60 * 1000);

    // ── Currently in progress ──
    if (now >= start && now < end) {
      const minutesIn = Math.floor((now - start) / 60000);
      const minutesRemaining = CLASS_DURATION_MINUTES - minutesIn;
      return {
        state: 'during',
        message: `Class started ${minutesIn} minute${minutesIn === 1 ? '' : 's'} ago, ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'} remaining`,
        event,
      };
    }

    // ── Upcoming today / soon, hasn't started ──
    if (now < start) {
      const minutesUntil = Math.ceil((start - now) / 60000);

      // If it's within the next ~12 hours, treat as "today's upcoming class"
      if (minutesUntil <= 12 * 60) {
        const day = dayName(start);
        const time = formatTime(start);

        if (minutesUntil < 60) {
          return {
            state: 'before',
            message: `${day} ${time} class starts in ${minutesUntil} minute${minutesUntil === 1 ? '' : 's'}`,
            event,
          };
        } else {
          const hours = Math.floor(minutesUntil / 60);
          return {
            state: 'before',
            message: `${day} ${time} class starts in ${hours} hour${hours === 1 ? '' : 's'}`,
            event,
          };
        }
      }

      // Otherwise it's further out — treat as "next class"
      const day = dayName(start);
      const time = formatTime(start);
      return {
        state: 'next',
        message: `Next class is ${day} at ${time}`,
        event,
      };
    }
  }

  // No events found at all
  return {
    state: 'none',
    message: 'No upcoming classes scheduled',
    event: null,
  };
}