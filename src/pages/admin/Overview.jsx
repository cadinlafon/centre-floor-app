import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import styled from 'styled-components';

const Page = styled.div``;
const Title = styled.h1`
  font-family: Georgia, serif;
  font-size: 1.6rem;
  color: var(--brown-dark);
  margin: 0 0 1.5rem;
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;
const Card = styled.div`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px var(--shadow);
`;
const CardIcon = styled.div`
  font-size: 1.6rem;
  margin-bottom: 0.5rem;
`;
const CardNum = styled.div`
  font-family: Georgia, serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--brown-dark);
  line-height: 1;
  margin-bottom: 0.25rem;
`;
const CardLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
`;
const ErrorNote = styled.p`color: #b91c1c; font-size: 0.85rem; margin: 0 0 1rem;`;

export default function AdminOverview() {
  const [stats, setStats] = useState({ total: 0, pending: 0, monwed: 0, tuethu: 0, both: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      let users;
      try {
        const snap = await getDocs(collection(db, 'users'));
        users = snap.docs.map(d => d.data());
      } catch {
        setError(true);
        setLoading(false);
        return;
      }
      setStats({
        total:   users.filter(u => u.status === 'approved').length,
        pending: users.filter(u => u.status === 'pending').length,
        monwed:  users.filter(u => u.class === 'monwed').length,
        tuethu:  users.filter(u => u.class === 'tuethu').length,
        both:    users.filter(u => u.class === 'both').length,
        admins:  users.filter(u => ['admin','superadmin'].includes(u.role)).length,
      });
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { icon: '👥', num: stats.total,   label: 'Registered Students' },
    { icon: '⏳', num: stats.pending, label: 'Awaiting Approval' },
    { icon: '🌿', num: stats.monwed,  label: 'Mon/Wed Class' },
    { icon: '🌸', num: stats.tuethu,  label: 'Tue/Thu Class' },
    { icon: '✨', num: stats.both,    label: 'Both Classes' },
    { icon: '🔑', num: stats.admins,  label: 'Admins' },
  ];

  return (
    <Page>
      <Title>Overview</Title>
      {error && <ErrorNote>Couldn't load stats — please refresh and try again.</ErrorNote>}
      <Grid>
        {cards.map(c => (
          <Card key={c.label}>
            <CardIcon>{c.icon}</CardIcon>
            <CardNum>{loading ? '–' : c.num}</CardNum>
            <CardLabel>{c.label}</CardLabel>
          </Card>
        ))}
      </Grid>
    </Page>
  );
}