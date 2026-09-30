import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, doc, getDocs, addDoc, deleteDoc, writeBatch, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toDate } from '../../utils/dates';
import { uidToToken } from '../../utils/tokens';
import styled from 'styled-components';

// ─── Styles ──────────────────────────────────────────────────────────────────

const Page = styled.div``;
const TopRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; flex-wrap: wrap; margin-bottom: 0.25rem;
`;
const Title = styled.h1`
  font-family: var(--font-serif, Georgia, serif);
  font-size: 1.6rem; color: var(--blue-deeper, #3D6E75); margin: 0;
`;
const Sub = styled.p`color: var(--text-muted); font-size: 0.875rem; margin: 0 0 1.5rem;`;

const BtnRow = styled.div`display: flex; gap: 0.5rem; flex-wrap: wrap;`;
const PrimaryBtn = styled.button`
  background: linear-gradient(135deg, var(--blue-deeper, #3D6E75), var(--blue, #87B7BF));
  color: white; border: none; border-radius: 10px;
  padding: 0.55rem 1.1rem; font-size: 0.875rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s;
  &:hover { opacity: 0.88; }
`;
const SecondaryBtn = styled.button`
  background: var(--bg-card, white); color: var(--text-secondary);
  border: 1.5px solid var(--border); border-radius: 10px;
  padding: 0.55rem 1rem; font-size: 0.875rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
  &:hover { background: var(--bg-secondary); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;
const DangerBtn = styled(SecondaryBtn)`
  color: #dc2626; border-color: #fca5a5;
  &:hover { background: #fef2f2; }
`;

const SearchRow = styled.div`
  display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap;
`;
const SearchInput = styled.input`
  flex: 1; min-width: 180px; padding: 0.65rem 1rem;
  border: 1.5px solid var(--border); border-radius: 10px;
  font-size: 0.9rem; background: var(--bg-card); color: var(--text-primary);
  &:focus { outline: none; border-color: var(--blue, #87B7BF); }
`;
const FilterSelect = styled.select`
  padding: 0.65rem 0.9rem; border: 1.5px solid var(--border);
  border-radius: 10px; font-size: 0.875rem;
  background: var(--bg-card); color: var(--text-primary);
  &:focus { outline: none; border-color: var(--blue, #87B7BF); }
`;

const BulkBar = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--blue, #87B7BF);
  border-radius: 12px; padding: 0.65rem 1rem;
  display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 0.75rem; flex-wrap: wrap;
`;
const BulkCount = styled.span`font-size: 0.875rem; font-weight: 600; color: var(--blue-deeper, #3D6E75); flex: 1;`;
const BulkBtn = styled.button`
  padding: 0.35rem 0.75rem; border-radius: 8px;
  font-size: 0.775rem; font-weight: 600; cursor: pointer;
  border: 1.5px solid var(--border); background: var(--bg-secondary);
  color: var(--text-secondary); transition: all 0.15s;
  &:hover { border-color: var(--blue, #87B7BF); color: var(--blue-deeper, #3D6E75); }
`;

const WorkoutList = styled.div`display: flex; flex-direction: column; gap: 0.6rem;`;
const WorkoutRow = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border);
  border-radius: 14px; padding: 0.9rem 1.1rem;
  display: flex; align-items: center; gap: 0.85rem;
  box-shadow: 0 1px 5px var(--shadow, rgba(0,0,0,0.06));
  transition: border-color 0.15s;
  &:hover { border-color: var(--blue, #87B7BF); }
`;
const RowCheck = styled.input`width: 16px; height: 16px; accent-color: var(--blue, #87B7BF); cursor: pointer; flex-shrink: 0;`;
const RowInfo = styled.div`flex: 1; min-width: 0;`;
const RowTitle = styled.p`
  font-size: 0.95rem; font-weight: 600; color: var(--text-primary);
  margin: 0 0 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;
const RowMeta = styled.p`font-size: 0.72rem; color: var(--text-muted); margin: 0;`;
const RowActions = styled.div`display: flex; gap: 0.4rem; align-items: center; flex-shrink: 0;`;

const STATUS_STYLES = {
  draft:    { bg: '#f3f4f6', color: '#6b7280', label: 'Draft' },
  active:   { bg: '#dcfce7', color: '#166534', label: 'Active' },
  disabled: { bg: '#fee2e2', color: '#991b1b', label: 'Disabled' },
  archived: { bg: '#ede9fe', color: '#5b21b6', label: 'Archived' },
};

const StatusBadge = styled.span`
  font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.6rem;
  border-radius: 20px;
  background: ${p => STATUS_STYLES[p.$s]?.bg || '#f3f4f6'};
  color: ${p => STATUS_STYLES[p.$s]?.color || '#6b7280'};
`;

const EditIconBtn = styled.button`
  width: 30px; height: 30px; border-radius: 8px;
  border: 1.5px solid var(--border); background: var(--bg-secondary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 0.85rem; transition: border-color 0.15s;
  &:hover { border-color: var(--blue, #87B7BF); }
`;

const DeleteIconBtn = styled(EditIconBtn)`
  &:hover { border-color: #fca5a5; background: #fef2f2; }
`;

const Empty = styled.div`
  text-align: center; padding: 3rem; color: var(--text-muted);
  font-size: 0.9rem;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminWorkouts() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    const snap = await getDocs(query(collection(db, 'workouts'), orderBy('createdAt', 'desc')));
    setWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  // load() is async and reused by the bulk/delete/create handlers to
  // refresh the list; its setState calls happen after the await.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const filtered = workouts.filter(w => {
    const matchSearch = !search.trim() || w.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(w => w.id)));
    }
  }

  async function bulkSetStatus(status) {
    setBulkBusy(true);
    try {
      const batch = writeBatch(db);
      selected.forEach(id => batch.update(doc(db, 'workouts', id), { status, updatedAt: serverTimestamp() }));
      await batch.commit();
      setSelected(new Set());
      await load();
    } catch {
      alert('Failed to update some workouts. Please try again.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} workout(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      const batch = writeBatch(db);
      selected.forEach(id => batch.delete(doc(db, 'workouts', id)));
      await batch.commit();
      setSelected(new Set());
      await load();
    } catch {
      alert('Failed to delete some workouts. Please try again.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleDelete(workout) {
    if (!confirm(`Delete "${workout.title || 'Untitled'}"?`)) return;
    setDeletingId(workout.id);
    try {
      await deleteDoc(doc(db, 'workouts', workout.id));
      await load();
    } catch {
      alert('Failed to delete workout. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate() {
    // Find how many untitled workouts already exist
    const untitledCount = workouts.filter(w => !w.title || w.title.startsWith('Untitled')).length;
    const titleNum = untitledCount + 1;

    try {
      const created = await addDoc(collection(db, 'workouts'), {
        title: `Untitled ${titleNum}`,
        content: '',
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/admin/workouts/${uidToToken(created.id)}`);
    } catch {
      alert('Failed to create workout. Please try again.');
    }
  }

  return (
    <Page>
      <TopRow>
        <Title>Workouts</Title>
        <BtnRow>
          <PrimaryBtn onClick={handleCreate}>+ New Workout</PrimaryBtn>
        </BtnRow>
      </TopRow>
      <Sub>{workouts.filter(w => w.status === 'active').length} active · {workouts.filter(w => w.status === 'draft').length} drafts</Sub>

      <SearchRow>
        <SearchInput
          placeholder="Search workouts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="archived">Archived</option>
        </FilterSelect>
        <SecondaryBtn onClick={toggleSelectAll} disabled={filtered.length === 0}>
          {selected.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
        </SecondaryBtn>
      </SearchRow>

      {selected.size > 0 && (
        <BulkBar>
          <BulkCount>{selected.size} selected</BulkCount>
          <BulkBtn onClick={() => bulkSetStatus('active')} disabled={bulkBusy}>✅ Activate</BulkBtn>
          <BulkBtn onClick={() => bulkSetStatus('disabled')} disabled={bulkBusy}>🚫 Disable</BulkBtn>
          <BulkBtn onClick={() => bulkSetStatus('archived')} disabled={bulkBusy}>📦 Archive</BulkBtn>
          <BulkBtn onClick={() => bulkSetStatus('draft')} disabled={bulkBusy}>📝 Set Draft</BulkBtn>
          <DangerBtn onClick={bulkDelete} disabled={bulkBusy}>{bulkBusy ? 'Working…' : '🗑 Delete'}</DangerBtn>
          <SecondaryBtn onClick={() => setSelected(new Set())} disabled={bulkBusy}>Cancel</SecondaryBtn>
        </BulkBar>
      )}

      {loading ? (
        <Empty>Loading…</Empty>
      ) : filtered.length === 0 ? (
        <Empty>No workouts found. Click "+ New Workout" to create one.</Empty>
      ) : (
        <WorkoutList>
          {filtered.map(w => {
            const token = uidToToken(w.id);
            return (
              <WorkoutRow key={w.id}>
                <RowCheck
                  type="checkbox"
                  checked={selected.has(w.id)}
                  onChange={() => toggleSelect(w.id)}
                  onClick={e => e.stopPropagation()}
                />
                <RowInfo>
                  <RowTitle>{w.title || 'Untitled'}</RowTitle>
                  <RowMeta>Created {formatDate(w.createdAt)} · Updated {formatDate(w.updatedAt)}</RowMeta>
                </RowInfo>
                <StatusBadge $s={w.status}>{STATUS_STYLES[w.status]?.label || w.status}</StatusBadge>
                <RowActions>
                  <EditIconBtn onClick={() => navigate(`/admin/workouts/${token}`)} aria-label="Edit" disabled={deletingId === w.id}>
                    ✎
                  </EditIconBtn>
                  <DeleteIconBtn onClick={() => handleDelete(w)} aria-label="Delete" disabled={deletingId === w.id}>
                    {deletingId === w.id ? '…' : '🗑'}
                  </DeleteIconBtn>
                </RowActions>
              </WorkoutRow>
            );
          })}
        </WorkoutList>
      )}
    </Page>
  );
}