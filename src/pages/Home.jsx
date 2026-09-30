import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Page = styled.div`
  min-height: 100%;
  background: var(--bg-primary);
  padding-bottom: 2rem;
`;

const Banner = styled.div`
  width: 100%;
  height: 400px;
  overflow: hidden;
  position: relative;
  background: linear-gradient(135deg, #a46b25 0%, #d97706 100%);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: square;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(to bottom, transparent, var(--bg-primary));
  }
`;

const WelcomeOverlay = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 1.25rem;
  z-index: 1;

  h2 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.4rem;
    color: white;
    text-shadow: 0 1px 4px rgba(0,0,0,0.4);
    margin: 0;
  }

  p {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.85);
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    margin: 0.1rem 0 0;
  }
`;

const Body = styled.div`
  padding: 0 1.25rem;
`;

const Section = styled.section`
  margin-bottom: 1.75rem;
`;

const SectionLabel = styled.p`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0 0 0.6rem;
`;

const ScheduleCard = styled.div`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem 1.25rem 1.1rem;
  box-shadow: 0 2px 12px var(--shadow);
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const ClassIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8ac1cb, #8ac1cb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex-shrink: 0;
`;

const ClassInfo = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    font-family: Georgia, serif;
    font-size: 1.05rem;
    color: var(--brown-dark);
    margin: 0 0 0.2rem;
  }

  p {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  margin-top: 0.45rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${p =>
    p.$variant === 'soon' ? '#fef3c7' :
    p.$variant === 'live' ? '#dcfce7' :
    '#f3f4f6'};
  color: ${p =>
    p.$variant === 'soon' ? '#92400e' :
    p.$variant === 'live' ? '#166534' :
    '#6b7280'};
`;

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
`;

const QuickBtn = styled.button`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 0.875rem 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px var(--shadow);

  &:hover {
    border-color: var(--amber);
    box-shadow: 0 2px 10px var(--shadow);
  }

  span.icon { font-size: 1.4rem; }

  span.label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-align: center;
    line-height: 1.2;
  }
`;

const PlaceholderCard = styled.div`
  background: var(--bg-card);
  border: 1.5px dashed var(--border);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  opacity: 0.7;
  margin-bottom: 0.75rem;
`;

const PlaceholderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1.5px dashed var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
`;

const PlaceholderText = styled.div`
  h4 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 0.15rem;
  }
  p {
    font-size: 0.78rem;
    color: var(--text-muted);
    margin: 0;
  }
`;

const ComingSoonTag = styled.span`
  margin-left: auto;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0.15rem 0.5rem;
  white-space: nowrap;
  flex-shrink: 0;
`;

// ─── Calendar Helpers ─────────────────────────────────────────────────────────

const CLASS_DURATION_MS = 60 * 60 * 1000;

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDay(date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function buildScheduleStatus(event) {
  if (!event?.start) return null;

  const start = new Date(event.start.dateTime || event.start.date);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + CLASS_DURATION_MS);
  const now = Date.now();
  const minsUntilStart = Math.round((start - now) / 60000);
  const minsUntilEnd = Math.round((end - now) / 60000);

  if (now < start.getTime()) {
    if (minsUntilStart < 60) {
      return {
        variant: 'soon',
        headline: `${event.summary || 'Class'} starts in ${minsUntilStart} min`,
        sub: `${formatDay(start)} at ${formatTime(start)}`,
        badge: 'Starting Soon',
      };
    }
    const hrs = Math.floor(minsUntilStart / 60);
    const mins = minsUntilStart % 60;
    const timeStr = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;
    return {
      variant: 'soon',
      headline: `${event.summary || 'Class'} in ${timeStr}`,
      sub: `${formatDay(start)} at ${formatTime(start)}`,
      badge: 'Upcoming',
    };
  } else if (now < end.getTime()) {
    const minsIn = Math.round((now - start.getTime()) / 60000);
    return {
      variant: 'live',
      headline: 'Class in progress',
      sub: `Started ${minsIn} min ago · ${minsUntilEnd} min remaining`,
      badge: '🟢 Live',
    };
  }
  return null;
}

function getCalendarFunctionUrl() {
  const fromEnv = import.meta.env.VITE_CALENDAR_FUNCTION_URL;
  return typeof fromEnv === 'string' && fromEnv.trim() ? fromEnv.trim() : '/.netlify/functions/calendar';
}

async function fetchNextEvent() {
  const response = await fetch(getCalendarFunctionUrl());
  const text = await response.text();

  if (!response.ok || !text) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html') || contentType.includes('text/plain')) {
    return null;
  }

  try {
    const data = JSON.parse(text);
    return data?.event || null;
  } catch (error) {
    console.warn('Calendar response was not valid JSON:', error.message);
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home({ userProfile }) {
  const [scheduleStatus, setScheduleStatus] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const navigate = useNavigate();

  const firstName = userProfile?.name?.split(' ')[0] || 'there';

  const classPath = userProfile?.class === 'tuethu' ? '/tue-thu' :
                    userProfile?.class === 'both' ? '/mon-wed' : '/mon-wed';
  const classLabel = userProfile?.class === 'tuethu' ? 'Tue/Thu' : 'Mon/Wed';

  const quickLinks = [
    { icon: '📅', label: 'Schedule', path: '/schedule' },
    { icon: '💬', label: 'Class Chat', path: '/class-chat' },
    { icon: '📢', label: 'Updates', path: '/announcement' },
    { icon: '🌿', label: classLabel, path: classPath },
    { icon: '🎬', label: 'Videos', path: '/videos' },
  ];

  useEffect(() => {
    async function load() {
      try {
        const event = await fetchNextEvent();
        setScheduleStatus(buildScheduleStatus(event));
      } catch (err) {
        console.error('Calendar error:', err);
        setScheduleStatus(null);
      } finally {
        setCalendarLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Page>
      <Banner>
        <img src="/banners/Banner.png" alt="Centre Floor" />
        <WelcomeOverlay>
          <h2>Welcome back, {firstName}!</h2>
          <p>Centre Floor Fitness</p>
        </WelcomeOverlay>
      </Banner>

      <Body>
        <Section style={{ marginTop: '0.25rem' }}>
          <SectionLabel>Next Class</SectionLabel>
          <ScheduleCard>
            <ClassIcon>🩰</ClassIcon>
            <ClassInfo>
              {calendarLoading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading schedule…</p>
              ) : scheduleStatus ? (
                <>
                  <h3>{scheduleStatus.headline}</h3>
                  <p>{scheduleStatus.sub}</p>
                  <StatusBadge $variant={scheduleStatus.variant}>
                    {scheduleStatus.badge}
                  </StatusBadge>
                </>
              ) : (
                <>
                  <h3>No upcoming classes</h3>
                  <p>Check the schedule page for details.</p>
                </>
              )}
            </ClassInfo>
          </ScheduleCard>
        </Section>

        <Section>
          <SectionLabel>Quick Access</SectionLabel>
          <QuickGrid>
            {quickLinks.map(link => (
              <QuickBtn key={link.path} onClick={() => navigate(link.path)}>
                <span className="icon">{link.icon}</span>
                <span className="label">{link.label}</span>
              </QuickBtn>
            ))}
          </QuickGrid>
        </Section>

        <Section>
          <SectionLabel>Coming Soon</SectionLabel>

          <PlaceholderCard>
            <PlaceholderIcon>🎥</PlaceholderIcon>
            <PlaceholderText>
              <h4>Class Recordings</h4>
              <p>Replay past sessions anytime</p>
            </PlaceholderText>
            <ComingSoonTag>Soon</ComingSoonTag>
          </PlaceholderCard>

          <PlaceholderCard>
            <PlaceholderIcon>📊</PlaceholderIcon>
            <PlaceholderText>
              <h4>Progress Tracker</h4>
              <p>Track your attendance and goals</p>
            </PlaceholderText>
            <ComingSoonTag>Soon</ComingSoonTag>
          </PlaceholderCard>

          <PlaceholderCard>
            <PlaceholderIcon>🛍️</PlaceholderIcon>
            <PlaceholderText>
              <h4>Studio Shop</h4>
              <p>Merchandise and class packages</p>
            </PlaceholderText>
            <ComingSoonTag>Soon</ComingSoonTag>
          </PlaceholderCard>

        </Section>
      </Body>
    </Page>
  );
}