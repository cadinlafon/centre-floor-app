import { useState, useEffect } from 'react';
import {
  collection, doc, getDoc, getCountFromServer, getDocs, query, where, setDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import styled from 'styled-components';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

const Page = styled.div``;
const Title = styled.h1`font-family: Georgia, serif; font-size: 1.6rem; color: var(--brown-dark); margin: 0 0 0.5rem;`;
const Sub = styled.p`font-size: 0.78rem; color: var(--text-muted); margin: 0 0 1.5rem; display: flex; align-items: center; gap: 0.5rem;`;
const RefreshBtn = styled.button`
  background: var(--bg-secondary); border: 1.5px solid var(--border); border-radius: 8px;
  padding: 0.25rem 0.7rem; font-size: 0.72rem; font-weight: 600; color: var(--text-secondary);
  cursor: pointer; transition: border-color 0.2s;
  &:hover { border-color: var(--amber); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem;`;
const StatCard = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 14px;
  padding: 1.1rem; box-shadow: 0 1px 6px var(--shadow);
`;
const StatNum = styled.div`font-family: Georgia, serif; font-size: 1.8rem; font-weight: 700; color: var(--brown-dark);`;
const StatLabel = styled.div`font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;`;

const Section = styled.section`margin-bottom: 2rem;`;
const SectionTitle = styled.h2`font-family: Georgia, serif; font-size: 1.1rem; color: var(--text-secondary); margin: 0 0 1rem;`;
const ChartCard = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 14px;
  padding: 1.25rem 1rem 0.5rem; box-shadow: 0 1px 6px var(--shadow);
`;
const EmptyState = styled.div`
  text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.875rem;
`;

const ROOMS = ['class-chat', 'mon-wed', 'tue-thu'];
const ROOM_LABELS = { 'class-chat': 'Class Chat', 'mon-wed': 'Mon/Wed', 'tue-thu': 'Tue/Thu' };

// Cache the expensive computed analytics in system_settings, so opening this
// page repeatedly doesn't re-read the message history every time. Anyone can
// reuse a cached result up to CACHE_MAX_AGE_MS old; after that, the next
// admin to open the page triggers a fresh (more expensive) read.
const CACHE_KEY = 'analyticsCache';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

function getLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function formatDayLabel(date) {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

async function computeFreshAnalytics() {
  const totalSnap = await getCountFromServer(query(collection(db, 'users'), where('status', '==', 'approved')));
  const total = totalSnap.data().count;

  const totalMessagesSnap = await getCountFromServer(collection(db, 'messages'));
  const totalMessages = totalMessagesSnap.data().count;

  const last14Days = getLastNDays(14);
  const dayBuckets = new Map(last14Days.map(d => [d.toDateString(), 0]));
  const roomCounts = { 'class-chat': 0, 'mon-wed': 0, 'tue-thu': 0 };

  let todayMessages = 0;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const fourteenDaysAgo = last14Days[0];

  // One flat-collection query replaces the old per-room subcollection loop —
  // a single `messages` collection with a `room` field, not a Firestore
  // subcollection per room.
  const recentSnap = await getDocs(
    query(collection(db, 'messages'), where('createdAt', '>=', Timestamp.fromDate(fourteenDaysAgo)))
  );

  recentSnap.docs.forEach(d => {
    const m = d.data();
    const ts = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
    if (Number.isNaN(ts.getTime())) return;
    if (ts >= todayStart) todayMessages++;
    if (roomCounts[m.room] !== undefined) roomCounts[m.room]++;
    const dayKey = new Date(ts.toDateString()).toDateString();
    if (dayBuckets.has(dayKey)) {
      dayBuckets.set(dayKey, dayBuckets.get(dayKey) + 1);
    }
  });

  return {
    stats: { total, todayMessages, totalMessages },
    messagesByDay: last14Days.map(d => ({
      day: formatDayLabel(d),
      messages: dayBuckets.get(d.toDateString()) || 0,
    })),
    messagesByRoom: ROOMS.map(room => ({
      room: ROOM_LABELS[room],
      messages: roomCounts[room],
    })),
  };
}

export default function AdminAnalytics() {
  const [stats, setStats] = useState({ total: 0, todayMessages: 0, totalMessages: 0 });
  const [messagesByDay, setMessagesByDay] = useState([]);
  const [messagesByRoom, setMessagesByRoom] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadFromCacheOrCompute(forceRefresh = false) {
    try {
      const cacheSnap = await getDoc(doc(db, 'system_settings', CACHE_KEY));
      const cacheData = cacheSnap.exists() ? cacheSnap.data() : null;
      const updatedAt = cacheData?.updatedAt?.toDate ? cacheData.updatedAt.toDate() : null;
      const cacheAge = updatedAt ? Date.now() - updatedAt.getTime() : Infinity;

      if (!forceRefresh && cacheData?.stats && cacheAge < CACHE_MAX_AGE_MS) {
        // Cache is fresh enough — use it, no expensive message reads needed.
        setStats(cacheData.stats);
        setMessagesByDay(cacheData.messagesByDay);
        setMessagesByRoom(cacheData.messagesByRoom);
        setLastUpdated(updatedAt);
        return;
      }

      // Cache missing or stale — do the real (more expensive) computation
      // and write the result back so the next admin reuses it.
      const fresh = await computeFreshAnalytics();
      setStats(fresh.stats);
      setMessagesByDay(fresh.messagesByDay);
      setMessagesByRoom(fresh.messagesByRoom);
      setLastUpdated(new Date());

      await setDoc(doc(db, 'system_settings', CACHE_KEY), { ...fresh, updatedAt: Timestamp.now() });
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // loadFromCacheOrCompute() is async and reused by the manual-refresh
  // button; its setState calls happen after the await, not synchronously
  // here. Intentionally run once on mount regardless of prop/state changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFromCacheOrCompute(false);
  }, []);

  function handleManualRefresh() {
    setRefreshing(true);
    loadFromCacheOrCompute(true);
  }

  const hasActivity = messagesByDay.some(d => d.messages > 0);

  return (
    <Page>
      <Title>Analytics</Title>
      <Sub>
        {lastUpdated
          ? `Last updated ${lastUpdated.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
          : loading ? 'Loading…' : ''}
        <RefreshBtn onClick={handleManualRefresh} disabled={refreshing || loading}>
          {refreshing ? 'Refreshing…' : '↻ Refresh now'}
        </RefreshBtn>
      </Sub>

      <Grid>
        <StatCard>
          <StatNum>{loading ? '–' : stats.total}</StatNum>
          <StatLabel>Registered Students</StatLabel>
        </StatCard>
        <StatCard>
          <StatNum>{loading ? '–' : stats.todayMessages}</StatNum>
          <StatLabel>Messages Today</StatLabel>
        </StatCard>
        <StatCard>
          <StatNum>{loading ? '–' : stats.totalMessages}</StatNum>
          <StatLabel>Total Messages</StatLabel>
        </StatCard>
      </Grid>

      <Section>
        <SectionTitle>Messages — Last 14 Days</SectionTitle>
        <ChartCard>
          {loading ? (
            <EmptyState>Loading…</EmptyState>
          ) : !hasActivity ? (
            <EmptyState>No message activity in the last 14 days yet.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={messagesByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="messages" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3, fill: '#d97706' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Section>

      <Section>
        <SectionTitle>Messages by Room</SectionTitle>
        <ChartCard>
          {loading ? (
            <EmptyState>Loading…</EmptyState>
          ) : stats.totalMessages === 0 ? (
            <EmptyState>No messages sent yet.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={messagesByRoom} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="room" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="messages" fill="#78350f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Section>
    </Page>
  );
}