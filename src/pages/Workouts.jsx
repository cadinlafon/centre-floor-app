import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import styled from 'styled-components';
import { db } from '../lib/firebase';

const Page = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 1.25rem;
`;

const Title = styled.h1`
  font-family: var(--font-serif, Georgia, serif);
  font-size: 1.65rem;
  color: var(--blue-deeper, #3d6e75);
  margin: 0 0 0.35rem;
`;

const Subtitle = styled.p`
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0;
`;

const Search = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 0.72rem 0.95rem;
  margin-bottom: 1rem;
  border: 1.5px solid var(--border);
  border-radius: 11px;
  background: var(--bg-card);
  color: var(--text-primary);
  font: inherit;

  &:focus {
    outline: none;
    border-color: var(--blue, #87b7bf);
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const Card = styled.article`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 15px;
  padding: 1.1rem 1.2rem;
  box-shadow: 0 1px 6px var(--shadow, rgba(0, 0, 0, 0.05));
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const WorkoutTitle = styled.h2`
  color: var(--text-primary);
  font-size: 1.05rem;
  margin: 0;
`;

const DateText = styled.span`
  color: var(--text-muted);
  font-size: 0.72rem;
  white-space: nowrap;
`;

const Content = styled.div`
  color: var(--text-secondary, var(--text-primary));
  font-size: 0.9rem;
  line-height: 1.6;
  margin-top: 0.8rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const Empty = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1.5px dashed var(--border);
  border-radius: 15px;
`;

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadWorkouts() {
      try {
        const snap = await getDocs(
          query(collection(db, 'workouts'), orderBy('createdAt', 'desc'))
        );

        if (cancelled) return;

        setWorkouts(
          snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(workout => workout.status === 'active')
        );
      } catch (err) {
        console.error('Failed to load workouts:', err);
        if (!cancelled) setError('Unable to load workouts right now. Please try again later.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWorkouts();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return workouts;

    return workouts.filter(workout =>
      `${workout.title || ''} ${workout.content || ''}`.toLowerCase().includes(term)
    );
  }, [workouts, search]);

  return (
    <Page>
      <Header>
        <Title>Workouts</Title>
        <Subtitle>View the workouts currently available to students.</Subtitle>
      </Header>

      {workouts.length > 0 && (
        <Search
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search workouts…"
          aria-label="Search workouts"
        />
      )}

      {loading ? (
        <Empty>Loading workouts…</Empty>
      ) : error ? (
        <Empty>{error}</Empty>
      ) : filtered.length === 0 ? (
        <Empty>
          {search ? 'No workouts matched your search.' : 'No workouts are available yet.'}
        </Empty>
      ) : (
        <List>
          {filtered.map(workout => (
            <Card key={workout.id}>
              <CardTop>
                <WorkoutTitle>{workout.title || 'Workout'}</WorkoutTitle>
                <DateText>{formatDate(workout.updatedAt || workout.createdAt)}</DateText>
              </CardTop>
              {workout.content && <Content>{workout.content}</Content>}
            </Card>
          ))}
        </List>
      )}
    </Page>
  );
}
