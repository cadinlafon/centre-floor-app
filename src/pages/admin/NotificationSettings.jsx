import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const Page = styled.div``;
const Title = styled.h1`
  font-family: Georgia, serif;
  font-size: 1.6rem;
  color: var(--brown-dark);
  margin: 0 0 0.35rem;
`;
const Subtitle = styled.p`
  color: var(--text-muted);
  margin: 0 0 1.5rem;
`;
const SectionLabel = styled.p`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0 0 0.6rem;
`;
const SectionNote = styled.p`
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: -0.35rem 0 0.75rem;
`;
const Card = styled.div`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px var(--shadow);
  margin-bottom: 1.75rem;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.95rem 1.1rem;
  border-bottom: 1px solid var(--border);
  &:last-child { border-bottom: none; }
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;
const RowInfo = styled.div``;
const RowLabel = styled.div`
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.9rem;
`;
const RowDesc = styled.div`
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
`;
const Toggle = styled.button`
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  color: white;
  flex-shrink: 0;
  background: ${p => p.$enabled ? 'linear-gradient(135deg, #78350f, #d97706)' : '#64748b'};
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const Message = styled.p`
  font-size: 0.8rem;
  color: ${p => p.$error ? '#dc2626' : '#166534'};
`;

const SETTINGS_DOC_ID = 'notificationTypes';

const USER_TOGGLES = [
  { key: 'classChat', label: 'New message in Class Chat', desc: 'Pushes to all approved users when someone posts in the shared Class Chat room.' },
  { key: 'ownClass', label: 'New message in their own class', desc: 'Pushes to users whose class matches the Mon/Wed or Tue/Thu room a message was posted in.' },
  { key: 'announcement', label: 'New announcement posted', desc: 'Pushes to all approved users when an admin publishes an announcement.' },
  { key: 'classChangeResolved', label: 'Class change request approved/denied', desc: 'Pushes to the specific student when an admin resolves their class-change request.' },
];

const ADMIN_TOGGLES = [
  { key: 'accessRequest', label: 'New access request', desc: 'Someone submits the public Request Access form.' },
  { key: 'inviteCompleted', label: 'User completes invite signup', desc: 'A student finishes setting their password after being approved.' },
  { key: 'bugOrFeatureSubmitted', label: 'New bug report or feature suggestion submitted', desc: 'A user submits a bug report or a feature suggestion.' },
  { key: 'classChangeOrRemovalSubmitted', label: 'Class change / account removal request submitted', desc: 'A student requests a class change or asks to be unregistered.' },
];

/** Missing doc or missing field both mean "on" — matches the notify.js default,
 * so a brand-new deployment behaves exactly as it did before these toggles existed. */
function isOn(settings, key) {
  return settings[key] !== false;
}

export default function AdminNotificationSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'system_settings', SETTINGS_DOC_ID));
        setSettings(snap.exists() ? snap.data() : {});
      } catch (err) {
        console.error(err);
        setMessage('Failed to load notification settings.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleToggle(key) {
    const nextValue = !isOn(settings, key);
    setBusyKey(key);
    setMessage('');
    try {
      await setDoc(doc(db, 'system_settings', SETTINGS_DOC_ID), { [key]: nextValue }, { merge: true });
      setSettings(prev => ({ ...prev, [key]: nextValue }));
    } catch (err) {
      console.error(err);
      setMessage('Failed to update. Please try again.');
    } finally {
      setBusyKey(null);
    }
  }

  function renderToggles(items) {
    return items.map(item => (
      <Row key={item.key}>
        <RowInfo>
          <RowLabel>{item.label}</RowLabel>
          <RowDesc>{item.desc}</RowDesc>
        </RowInfo>
        <Toggle
          $enabled={isOn(settings, item.key)}
          onClick={() => handleToggle(item.key)}
          disabled={loading || busyKey === item.key}
        >
          {busyKey === item.key ? 'Saving…' : isOn(settings, item.key) ? 'On' : 'Off'}
        </Toggle>
      </Row>
    ));
  }

  return (
    <Page>
      <Title>Notification Settings</Title>
      <Subtitle>Turn categories of push notifications on or off app-wide. This doesn't affect any individual user's own notification permission — see the Notifications page for that.</Subtitle>

      <SectionLabel>All User Notifications</SectionLabel>
      <SectionNote>Sent to whichever approved users the event applies to.</SectionNote>
      <Card>{loading ? <Row><RowInfo>Loading…</RowInfo></Row> : renderToggles(USER_TOGGLES)}</Card>

      <SectionLabel>Admin Notifications</SectionLabel>
      <SectionNote>Sent only to admin/superadmin accounts.</SectionNote>
      <Card>{loading ? <Row><RowInfo>Loading…</RowInfo></Row> : renderToggles(ADMIN_TOGGLES)}</Card>

      {message && <Message $error>{message}</Message>}
    </Page>
  );
}
