import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { collection, doc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { triggerNotification } from '../../utils/notifyServer';
import { registerPushNotifications } from '../../utils/pushNotifications';

const Page = styled.div``;
const Title = styled.h1`
  font-family: Georgia, serif;
  font-size: 1.6rem;
  color: var(--brown-dark);
  margin: 0 0 0.35rem;
`;
const Subtitle = styled.p`
  color: var(--text-muted);
  margin: 0 0 1.25rem;
`;
const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
`;
const SummaryCard = styled.div`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 0.9rem 1rem;
  box-shadow: 0 1px 6px var(--shadow);
`;
const SummaryLabel = styled.div`
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.25rem;
`;
const SummaryValue = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--brown-dark);
`;
const ToolBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
`;
const PrimaryBtn = styled.button`
  border: none;
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  background: linear-gradient(135deg, #78350f, #d97706);
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
`;
const SecondaryBtn = styled.button`
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
`;
const Card = styled.div`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px var(--shadow);
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.95rem 1rem;
  border-bottom: 1px solid var(--border);
  &:last-child { border-bottom: none; }
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;
const UserInfo = styled.div``;
const Name = styled.div`
  font-weight: 700;
  color: var(--text-primary);
`;
const Meta = styled.div`
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
`;
const StatusChip = styled.span`
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: ${p => p.$tone === 'good' ? '#dcfce7' : p.$tone === 'warn' ? '#fef3c7' : '#f1f5f9'};
  color: ${p => p.$tone === 'good' ? '#166534' : p.$tone === 'warn' ? '#92400e' : '#334155'};
`;
const Toggle = styled.button`
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  color: white;
  background: ${p => p.$enabled ? 'linear-gradient(135deg, #78350f, #d97706)' : '#64748b'};
`;
const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;
const TestBtn = styled.button`
  border: 1.5px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 8px;
  padding: 0.45rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
`;
const EmptyState = styled.div`
  padding: 1rem;
  color: var(--text-muted);
`;
const Message = styled.p`
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: ${p => p.$error ? '#dc2626' : '#166534'};
`;

function getRecipientStatus(user) {
  const hasPlayerId = Boolean(user.oneSignalPlayerId) || (Array.isArray(user.oneSignalPlayerIds) && user.oneSignalPlayerIds.some(Boolean));
  if (!user.notificationsEnabled) return { label: 'Disabled', tone: 'neutral' };
  if (hasPlayerId) return { label: 'Eligible', tone: 'good' };
  return { label: 'Enabled • no player ID yet', tone: 'warn' };
}

export default function AdminNotifications({ userProfile }) {
  const [users, setUsers] = useState([]);
  const [busyIds, setBusyIds] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    const snap = await getDocs(collection(db, 'users'));
    const nextUsers = snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setUsers(nextUsers);
    setLoading(false);
  }

  // loadUsers() is async and reused after every toggle; its setState calls
  // happen after the await, not synchronously here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, []);

  async function handleToggle(user) {
    setBusyIds(prev => [...prev, user.uid]);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationsEnabled: !user.notificationsEnabled,
        notificationsUpdatedAt: serverTimestamp(),
      });
      setMessage(`${user.name || user.email || 'User'} notifications ${user.notificationsEnabled ? 'disabled' : 'enabled'}.`);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setMessage('Failed to update notification access.');
    } finally {
      setBusyIds(prev => prev.filter(id => id !== user.uid));
    }
  }

  async function handleAddPlayerId() {
    if (!userProfile?.uid) {
      setMessage('You need to be signed in before adding a player ID.');
      return;
    }

    setBusyIds(prev => [...prev, 'player-id']);
    try {
      const playerId = await registerPushNotifications(userProfile, { requestPermission: true });
      if (playerId) {
        setMessage('Player ID added. This device can now receive notifications.');
      } else {
        setMessage('Player ID could not be created yet. Please allow the browser prompt and try again.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to add the player ID.');
    } finally {
      setBusyIds(prev => prev.filter(id => id !== 'player-id'));
    }
  }

  async function handleSendTest(user) {
    setBusyIds(prev => [...prev, `${user.uid}:test`]);
    try {
      const result = await triggerNotification('test', {
        userId: user.uid,
        title: 'Test notification',
        body: `Hello ${user.name || 'there'} — this is a test from Élan.`,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Request failed');
      }

      setMessage(`Test notification sent to ${user.name || user.email || 'the selected user'}.`);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Failed to send the test notification.');
    } finally {
      setBusyIds(prev => prev.filter(id => `${id}` !== `${user.uid}:test`));
    }
  }

  async function handleSendTestToAllEnabled() {
    const enabledUsers = users.filter(user => user.notificationsEnabled);
    if (enabledUsers.length === 0) {
      setMessage('No users are currently enabled for notifications.');
      return;
    }

    for (const user of enabledUsers) {
      await handleSendTest(user);
    }
  }

  const enabledCount = users.filter(user => user.notificationsEnabled).length;
  const eligibleCount = users.filter(user => user.notificationsEnabled && (Boolean(user.oneSignalPlayerId) || (Array.isArray(user.oneSignalPlayerIds) && user.oneSignalPlayerIds.some(Boolean)))).length;
  const disabledCount = users.length - enabledCount;

  return (
    <Page>
      <Title>Notifications</Title>
      <Subtitle>Review who can receive push notifications, toggle access, and send a test message to any user.</Subtitle>

      <SummaryGrid>
        <SummaryCard>
          <SummaryLabel>Total users</SummaryLabel>
          <SummaryValue>{users.length}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>Enabled</SummaryLabel>
          <SummaryValue>{enabledCount}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>Eligible recipients</SummaryLabel>
          <SummaryValue>{eligibleCount}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>Disabled</SummaryLabel>
          <SummaryValue>{disabledCount}</SummaryValue>
        </SummaryCard>
      </SummaryGrid>

      <ToolBar>
        <SecondaryBtn onClick={handleAddPlayerId} disabled={busyIds.includes('player-id')}>
          {busyIds.includes('player-id') ? 'Adding…' : 'Add player ID'}
        </SecondaryBtn>
        <PrimaryBtn onClick={handleSendTestToAllEnabled}>Send test to enabled users</PrimaryBtn>
      </ToolBar>

      <Card>
        {loading ? (
          <EmptyState>Loading users…</EmptyState>
        ) : users.length === 0 ? (
          <EmptyState>No users found.</EmptyState>
        ) : users.map(user => {
          const status = getRecipientStatus(user);
          return (
            <Row key={user.uid}>
              <UserInfo>
                <Name>{user.name || user.email || 'Unnamed user'}</Name>
                <Meta>
                  {user.email || 'No email'} • {user.role || 'student'} • {user.status || 'pending'}
                </Meta>
                <StatusChip $tone={status.tone}>{status.label}</StatusChip>
              </UserInfo>
              <ActionRow>
                <Toggle $enabled={Boolean(user.notificationsEnabled)} onClick={() => handleToggle(user)} disabled={busyIds.includes(user.uid)}>
                  {busyIds.includes(user.uid) ? 'Saving…' : (user.notificationsEnabled ? 'Enabled' : 'Disabled')}
                </Toggle>
                <TestBtn onClick={() => handleSendTest(user)} disabled={busyIds.includes(`${user.uid}:test`)}>
                  {busyIds.includes(`${user.uid}:test`) ? 'Sending…' : 'Send test'}
                </TestBtn>
              </ActionRow>
            </Row>
          );
        })}
      </Card>
      {message ? <Message $error={message.includes('Failed')}>{message}</Message> : null}
    </Page>
  );
}
