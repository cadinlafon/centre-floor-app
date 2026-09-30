import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toDate } from '../utils/dates';
import { markAnnouncementSeen } from '../utils/announcementSeen';

const Page = styled.div`padding: 1.25rem; max-width: 600px; margin: 0 auto;`;
const Title = styled.h1`font-family: Georgia, serif; font-size: 1.4rem; color: var(--brown-dark); margin: 0 0 0.25rem;`;
const Sub = styled.p`font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1.5rem;`;

const EmptyCard = styled.div`
  background: var(--bg-card); border: 1.5px dashed var(--border);
  border-radius: 16px; padding: 3rem 1.5rem; text-align: center;
`;
const EmptyIcon = styled.div`font-size: 2.5rem; margin-bottom: 0.75rem;`;
const EmptyTitle = styled.h3`font-family: Georgia, serif; color: var(--brown-dark); margin: 0 0 0.35rem;`;
const EmptyBody = styled.p`font-size: 0.875rem; color: var(--text-muted); margin: 0;`;

const Card = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border);
  border-radius: 16px; padding: 1.25rem; margin-bottom: 1rem;
  box-shadow: 0 2px 10px var(--shadow);
`;
const CardTitle = styled.h3`font-family: Georgia, serif; font-size: 1.1rem; color: var(--brown-dark); margin: 0 0 0.4rem;`;
const CardBody = styled.p`font-size: 0.9rem; color: var(--text-primary); line-height: 1.5; margin: 0 0 0.75rem; white-space: pre-wrap;`;
const CardMeta = styled.p`font-size: 0.72rem; color: var(--text-muted); margin: 0;`;
const EventDate = styled.p`
  font-size: 0.78rem; color: var(--brown-dark); font-weight: 600; margin: 0 0 0.6rem;
  display: flex; align-items: center; gap: 0.35rem;
`;

const GoBtn = styled.button`
  margin-top: 0.75rem; padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #78350f, #d97706); color: white;
  border: none; border-radius: 9px; font-size: 0.825rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
`;

const Divider = styled.div`height: 1px; background: var(--border); margin: 0.9rem 0 0.75rem;`;

const ErrorCard = styled(EmptyCard)`border-style: solid; border-color: #fca5a5;`;

function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

const PAGE_LABELS = {
  '/schedule': 'Schedule', '/class-chat': 'Class Chat',
  '/mon-wed': 'Mon/Wed Chat', '/tue-thu': 'Tue/Thu Chat',
  '/home': 'Home', '/account': 'Account',
};

export default function Announcement({ userProfile }) {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      setLoading(true);
      setError(false);
      let rows;
      try {
        const snap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')));
        rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
        return;
      }
      if (cancelled) return;
      setAnnouncements(rows);
      setLoading(false);
      if (rows[0]) markAnnouncementSeen(userProfile?.uid, rows[0].id);
    }

    loadAnnouncements();
    return () => { cancelled = true; };
  }, [userProfile?.uid]);

  function handleGoTo(announcement) {
    if (announcement.linkType === 'page') {
      navigate(announcement.linkValue);
    } else if (announcement.linkType === 'url') {
      window.open(announcement.linkValue, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <Page>
      <Title>Announcements</Title>
      <Sub>Important updates from your instructor</Sub>

      {loading ? (
        <EmptyCard><EmptyBody>Loading…</EmptyBody></EmptyCard>
      ) : error ? (
        <ErrorCard>
          <EmptyIcon>⚠️</EmptyIcon>
          <EmptyTitle>Couldn't load announcements</EmptyTitle>
          <EmptyBody>Please check your connection and try again.</EmptyBody>
        </ErrorCard>
      ) : announcements.length === 0 ? (
        <EmptyCard>
          <EmptyIcon>📢</EmptyIcon>
          <EmptyTitle>No announcements yet</EmptyTitle>
          <EmptyBody>Check back here for updates, class changes, and news from the studio.</EmptyBody>
        </EmptyCard>
      ) : (
        announcements.map(a => (
          <Card key={a.id}>
            {a.eventDate && <EventDate>📅 {formatEventDate(a.eventDate)}</EventDate>}
            <CardTitle>{a.title}</CardTitle>
            <CardBody>{a.body}</CardBody>

            {a.linkType && (
              <GoBtn onClick={() => handleGoTo(a)}>
                {a.linkType === 'page' ? `Go to ${PAGE_LABELS[a.linkValue] || a.linkValue} →` : 'Open Link →'}
              </GoBtn>
            )}

            <Divider />
            <CardMeta>{a.authorName} · {formatDate(a.createdAt)}</CardMeta>
          </Card>
        ))
      )}
    </Page>
  );
}
