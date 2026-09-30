import { useState, useEffect } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uidToToken } from '../../utils/tokens';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// ─── Styles ──────────────────────────────────────────────────────────────────

const Page = styled.div``;
const Title = styled.h1`font-family: Georgia, serif; font-size: 1.6rem; color: var(--brown-dark); margin: 0 0 0.25rem;`;
const Sub = styled.p`color: var(--text-muted); font-size: 0.875rem; margin: 0 0 1.25rem;`;

const SearchBar = styled.input`
  width: 100%; padding: 0.7rem 1rem; border: 1.5px solid var(--border);
  border-radius: 10px; font-size: 0.95rem; background: var(--bg-card);
  color: var(--text-primary); margin-bottom: 0.75rem; box-sizing: border-box;
  &:focus { outline: none; border-color: var(--amber); }
`;

const FiltersRow = styled.div`display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem;`;
const FilterSelect = styled.select`
  padding: 0.6rem 0.9rem; border: 1.5px solid var(--border); border-radius: 10px;
  font-size: 0.875rem; background: var(--bg-card); color: var(--text-primary);
  &:focus { outline: none; border-color: var(--amber); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 900px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 640px) { grid-template-columns: repeat(2, 1fr); }
`;

const Card = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 16px;
  padding: 1.25rem 0.75rem; display: flex; flex-direction: column; align-items: center;
  gap: 0.5rem; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 6px var(--shadow); text-align: center;
  &:hover { border-color: var(--amber); box-shadow: 0 4px 14px var(--shadow); }
`;

const AdminToggleBtn = styled.button`
  margin-top: 0.25rem; padding: 0.35rem 0.7rem; border-radius: 8px;
  font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
  border: 1.5px solid ${p => (p.$isAdmin ? '#fca5a5' : '#a78bfa')};
  background: ${p => (p.$isAdmin ? '#fee2e2' : '#ede9fe')};
  color: ${p => (p.$isAdmin ? '#dc2626' : '#5b21b6')};
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PhotoCircle = styled.div`
  width: 72px; height: 72px; border-radius: 50%; overflow: hidden;
  border: 2.5px solid var(--border); flex-shrink: 0;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const CardName = styled.p`
  font-size: 0.875rem; font-weight: 700; color: var(--text-primary);
  margin: 0; line-height: 1.3;
`;

const ClassTag = styled.span`
  font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 20px;
  background: ${p =>
    p.$class === 'admin' ? '#fef3c7' :
    p.$class === 'both'   ? '#ede9fe' :
    '#f0fdf4'};
  color: ${p =>
    p.$class === 'admin' ? '#92400e' :
    p.$class === 'both'   ? '#5b21b6' :
    '#166534'};
`;

const Empty = styled.div`
  text-align: center; padding: 3rem; color: var(--text-muted);
  grid-column: 1 / -1;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const classLabel = c =>
  c === 'monwed' ? 'Mon/Wed' :
  c === 'tuethu' ? 'Tue/Thu' :
  c === 'both'   ? 'Both' : '—';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [togglingUid, setTogglingUid] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let docs;
      try {
        const snap = await getDocs(collection(db, 'users'));
        docs = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
        return;
      }
      if (cancelled) return;

      const all = docs.filter(u => u.status === 'approved' || ['admin', 'superadmin'].includes(u.role));

      // Admins first, then alphabetical by name
      all.sort((a, b) => {
        const aAdmin = ['admin', 'superadmin'].includes(a.role);
        const bAdmin = ['admin', 'superadmin'].includes(b.role);
        if (aAdmin !== bAdmin) return aAdmin ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      setUsers(all);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  async function handleToggleAdmin(user) {
    const isAdmin = ['admin', 'superadmin'].includes(user.role);
    const nextRole = isAdmin ? 'student' : 'admin';
    const confirmMsg = isAdmin
      ? `Remove admin access from ${user.name || 'this user'}?`
      : `Make ${user.name || 'this user'} an admin?`;
    if (!confirm(confirmMsg)) return;

    setTogglingUid(user.uid);
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: nextRole });

      setUsers(prev => {
        const updated = prev.map(u => (u.uid === user.uid ? { ...u, role: nextRole } : u));
        updated.sort((a, b) => {
          const aAdmin = ['admin', 'superadmin'].includes(a.role);
          const bAdmin = ['admin', 'superadmin'].includes(b.role);
          if (aAdmin !== bAdmin) return aAdmin ? -1 : 1;
          return (a.name || '').localeCompare(b.name || '');
        });
        return updated;
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update role. Please try again.');
    } finally {
      setTogglingUid(null);
    }
  }

  const filtered = users.filter(u => {
    const term = search.trim().toLowerCase();
    const matchSearch = !term ||
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term);
    const matchClass = classFilter === 'all' || u.class === classFilter ||
      (classFilter === 'none' && !['monwed', 'tuethu', 'both'].includes(u.class));
    return matchSearch && matchClass;
  });

  return (
    <Page>
      <Title>Roster</Title>
      <Sub>{users.length} student{users.length !== 1 ? 's' : ''} enrolled</Sub>

      <SearchBar
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <FiltersRow>
        <FilterSelect value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="all">All classes</option>
          <option value="monwed">Mon / Wed</option>
          <option value="tuethu">Tue / Thu</option>
          <option value="both">Both</option>
          <option value="none">No class assigned</option>
        </FilterSelect>
      </FiltersRow>

      {loading ? (
        <Empty>Loading roster…</Empty>
      ) : error ? (
        <Empty>Couldn't load the roster. Please refresh and try again.</Empty>
      ) : (
        <Grid>
          {filtered.length === 0 && <Empty>No students found.</Empty>}
          {filtered.map(user => {
            const isAdmin = ['admin', 'superadmin'].includes(user.role);
            const token = uidToToken(user.uid);
            return (
              <Card key={user.uid} onClick={() => navigate(`/admin/users/${token}`)}>
                <PhotoCircle>
                  <img src={user.photoURL || '/icons/ProfilePlaceholder.png'} alt={user.name} />
                </PhotoCircle>
                <CardName>{user.name || 'Unknown'}</CardName>
                <ClassTag $class={isAdmin ? 'admin' : user.class}>
                  {isAdmin ? '⚙️ Admin' : classLabel(user.class)}
                </ClassTag>
                <AdminToggleBtn
                  type="button"
                  $isAdmin={isAdmin}
                  disabled={togglingUid === user.uid}
                  onClick={e => { e.stopPropagation(); handleToggleAdmin(user); }}
                >
                  {togglingUid === user.uid ? '…' : isAdmin ? 'Remove Admin' : 'Make Admin'}
                </AdminToggleBtn>
              </Card>
            );
          })}
        </Grid>
      )}
    </Page>
  );
}