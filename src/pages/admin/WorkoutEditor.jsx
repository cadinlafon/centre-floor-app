import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { collection, doc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uidToToken } from '../../utils/tokens';

const Page = styled.div`max-width: 720px; margin: 0 auto;`;
const BackBtn = styled.button`
  background: none; border: none; color: var(--text-muted); font-size: 0.875rem;
  cursor: pointer; padding: 0; margin-bottom: 1.25rem; font-weight: 600;
  &:hover { color: var(--amber); }
`;
const Card = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 16px;
  padding: 1.5rem; box-shadow: 0 2px 10px var(--shadow);
`;
const Field = styled.div`
  margin-bottom: 1.1rem;
  label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
  input, textarea, select {
    width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid var(--border); border-radius: 9px;
    font-size: 0.9rem; background: var(--bg-secondary); color: var(--text-primary);
    box-sizing: border-box; font-family: inherit;
    &:focus { outline: none; border-color: var(--amber); }
  }
  textarea { min-height: 240px; resize: vertical; line-height: 1.5; }
`;
const BtnRow = styled.div`display: flex; gap: 0.75rem; margin-top: 1.25rem;`;
const SaveBtn = styled.button`
  flex: 1; padding: 0.75rem; background: linear-gradient(135deg, #78350f, #d97706);
  color: white; border: none; border-radius: 10px; font-size: 0.9rem; font-weight: 700;
  cursor: ${p => p.disabled ? 'default' : 'pointer'}; opacity: ${p => p.disabled ? 0.7 : 1};
`;
const SavedNote = styled.span`font-size: 0.8rem; color: #166534; align-self: center;`;
const CenteredNote = styled.p`color: var(--text-muted); padding: 3rem 0; text-align: center; font-size: 0.9rem;`;

const STATUSES = ['draft', 'active', 'disabled', 'archived'];

export default function WorkoutEditor() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const snap = await getDocs(collection(db, 'workouts'));
      if (cancelled) return;
      const match = snap.docs.find(d => uidToToken(d.id) === token);
      if (!match) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const mapped = { id: match.id, ...match.data() };
      setWorkout(mapped);
      setTitle(mapped.title || '');
      setContent(mapped.content || '');
      setStatus(mapped.status || 'draft');
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, 'workouts', workout.id), {
        title: title.trim() || 'Untitled',
        content,
        status,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert("Couldn't save the workout. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Page><CenteredNote>Loading workout…</CenteredNote></Page>;
  if (notFound) return <Page><CenteredNote>Workout not found.</CenteredNote></Page>;

  return (
    <Page>
      <BackBtn onClick={() => navigate('/admin/workouts')}>← Back to Workouts</BackBtn>
      <Card>
        <Field>
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Workout title" />
        </Field>
        <Field>
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </Field>
        <Field>
          <label>Content</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write the workout details…" />
        </Field>
        <BtnRow>
          <SaveBtn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Workout'}</SaveBtn>
          {saved && <SavedNote>Saved ✓</SavedNote>}
        </BtnRow>
      </Card>
    </Page>
  );
}
