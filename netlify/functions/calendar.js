const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || '9595cc2ed11dbee0d290750537c7cf020f4bbce20c0fdcec66d74aaa18868313@group.calendar.google.com';
const CALENDAR_FEED_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;
const CLASS_DURATION_MS = 60 * 60 * 1000;

function unfoldIcsLines(text) {
  return text
    .split(/\r?\n/)
    .reduce((lines, line) => {
      if (line.startsWith(' ') || line.startsWith('\t')) {
        const lastLine = lines[lines.length - 1];
        if (lastLine) lines[lines.length - 1] = `${lastLine}${line.trim()}`;
      } else {
        lines.push(line);
      }
      return lines;
    }, []);
}

function parseIcsDate(value) {
  if (!value) return null;
  const normalized = String(value).trim();

  if (/^\d{8}$/.test(normalized)) {
    return new Date(`${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}T00:00:00`);
  }

  if (/^\d{8}T\d{6}Z$/.test(normalized)) {
    const year = normalized.slice(0, 4);
    const month = normalized.slice(4, 6);
    const day = normalized.slice(6, 8);
    const hour = normalized.slice(9, 11);
    const minute = normalized.slice(11, 13);
    const second = normalized.slice(13, 15);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }

  if (/^\d{8}T\d{6}$/.test(normalized)) {
    const year = normalized.slice(0, 4);
    const month = normalized.slice(4, 6);
    const day = normalized.slice(6, 8);
    const hour = normalized.slice(9, 11);
    const minute = normalized.slice(11, 13);
    const second = normalized.slice(13, 15);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }

  return new Date(normalized);
}

function parseCalendarEvents(icsText) {
  const lines = unfoldIcsLines(icsText || '');
  const events = [];
  let currentEvent = null;

  lines.forEach((line) => {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
      return;
    }

    if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.summary && currentEvent.start) {
        events.push(currentEvent);
      }
      currentEvent = null;
      return;
    }

    if (!currentEvent) return;

    if (line.startsWith('SUMMARY:')) {
      currentEvent.summary = line.replace('SUMMARY:', '').trim();
    }

    if (line.startsWith('DTSTART')) {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex >= 0) {
        const value = line.slice(separatorIndex + 1).trim();
        const startDate = parseIcsDate(value);
        if (startDate && !Number.isNaN(startDate.getTime())) {
          currentEvent.start = { dateTime: startDate.toISOString() };
        }
      }
    }
  });

  return events;
}

function pickNextEvent(events) {
  const now = Date.now();
  const upcoming = events
    .map((event) => ({
      ...event,
      startTime: new Date(event.start?.dateTime || event.start?.date).getTime(),
    }))
    .filter((event) => Number.isFinite(event.startTime) && event.startTime >= now - CLASS_DURATION_MS)
    .sort((a, b) => a.startTime - b.startTime);

  return upcoming[0] || null;
}

// The frontend is served from Firebase Hosting (a different origin than this
// Netlify function), so every response needs CORS headers or the browser
// will block it even though the request itself succeeds.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler = async (event) => {
  if (event?.httpMethod === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (event?.httpMethod && event.httpMethod !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const response = await fetch(CALENDAR_FEED_URL);
    if (!response.ok) {
      throw new Error(`Calendar feed request failed: ${response.status}`);
    }

    const icsText = await response.text();
    const events = parseCalendarEvents(icsText);
    const nextEvent = pickNextEvent(events);

    return new Response(JSON.stringify({ ok: true, event: nextEvent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
};

export default handler;
