import { useState, useEffect } from 'react';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toDate } from '../../utils/dates';
import { triggerNotification } from '../../utils/notifyServer';
import styled from 'styled-components';

const Page = styled.div``;
const TopRow = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.4rem; flex-wrap: wrap;`;
const Title = styled.h1`font-family: Georgia, serif; font-size: 1.6rem; color: var(--brown-dark); margin: 0;`;
const Sub = styled.p`color: var(--text-muted); font-size: 0.875rem; margin: 0 0 1.5rem;`;

const BtnRow = styled.div`display: flex; gap: 0.5rem;`;
const AddBtn = styled.button`
  background: linear-gradient(135deg, #78350f, #d97706); color: white; border: none;
  border-radius: 10px; padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s; &:hover { opacity: 0.9; }
`;
const PushBtn = styled.button`
  background: var(--bg-card); color: var(--brown-dark); border: 1.5px solid var(--amber);
  border-radius: 10px; padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: background 0.2s;
  &:hover { background: var(--bg-secondary); }
`;

const Card = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 14px;
  padding: 1.1rem 1.25rem; margin-bottom: 0.75rem; box-shadow: 0 1px 6px var(--shadow);
`;
const CardTop = styled.div`display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;`;
const CardTitle = styled.h3`font-size: 1rem; color: var(--text-primary); margin: 0 0 0.25rem;`;
const CardBody = styled.p`font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 0.5rem; line-height: 1.45; white-space: pre-wrap;`;
const CardMeta = styled.p`font-size: 0.72rem; color: var(--text-muted); margin: 0;`;
const Tags = styled.div`display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.5rem;`;
const Tag = styled.span`
  font-size: 0.68rem; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 20px;
  background: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border);
`;
const Actions = styled.div`display: flex; gap: 0.4rem; flex-shrink: 0;`;
const IconBtn = styled.button`
  background: var(--bg-secondary); border: 1.5px solid var(--border); border-radius: 8px;
  width: 28px; height: 28px; font-size: 0.8rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.2s; &:hover { border-color: var(--amber); }
`;
const Empty = styled.div`text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.95rem;`;

// ── Modal ──────────────────────────────────────────────────────────────────────

const Modal = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1.25rem;
  overflow-y: auto;
`;
const ModalCard = styled.div`
  background: var(--bg-card); border-radius: 16px; padding: 1.75rem;
  width: 100%; max-width: 460px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  margin: auto;
  h2 { font-family: Georgia, serif; color: var(--brown-dark); margin: 0 0 1.25rem; font-size: 1.25rem; }
`;
const Field = styled.div`
  margin-bottom: 1rem;
  label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; }
  input, textarea, select {
    width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid var(--border); border-radius: 9px;
    font-size: 0.9rem; background: var(--bg-secondary); color: var(--text-primary);
    box-sizing: border-box; font-family: inherit;
    &:focus { outline: none; border-color: var(--amber); }
  }
  textarea { min-height: 90px; resize: vertical; line-height: 1.45; }
`;
const DatePresets = styled.div`display: flex; gap: 0.4rem; margin-top: 0.4rem; flex-wrap: wrap;`;
const PresetBtn = styled.button`
  font-size: 0.72rem; padding: 0.25rem 0.6rem; border-radius: 20px;
  border: 1.5px solid var(--border); background: var(--bg-card); color: var(--text-secondary);
  cursor: pointer; transition: border-color 0.2s; &:hover { border-color: var(--amber); }
`;
const ToggleRow = styled.label`
  display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0;
  font-size: 0.875rem; color: var(--text-primary); cursor: pointer;
  input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--amber); cursor: pointer; }
`;
const AttachToggle = styled.div`display: flex; gap: 0.5rem; margin-bottom: 0.6rem;`;
const AttachOption = styled.button`
  flex: 1; padding: 0.5rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600;
  cursor: pointer; border: 1.5px solid ${p => p.$active ? 'var(--amber)' : 'var(--border)'};
  background: ${p => p.$active ? 'var(--bg-secondary)' : 'var(--bg-card)'};
  color: ${p => p.$active ? 'var(--brown-dark)' : 'var(--text-muted)'};
`;
const ModalBtns = styled.div`display: flex; gap: 0.75rem; margin-top: 1.25rem;`;
const SaveBtn = styled.button`
  flex: 1; padding: 0.7rem; background: linear-gradient(135deg, #78350f, #d97706);
  color: white; border: none; border-radius: 10px; font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s;
  &:hover { opacity: 0.9; } &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const CancelBtn = styled.button`
  flex: 1; padding: 0.7rem; background: var(--bg-secondary); border: 1.5px solid var(--border);
  color: var(--text-secondary); border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
`;

const PAGE_OPTIONS = [
  { value: '/home', label: 'Home' },
  { value: '/schedule', label: 'Schedule' },
  { value: '/class-chat', label: 'Class Chat' },
  { value: '/mon-wed', label: 'Mon/Wed Chat' },
  { value: '/tue-thu', label: 'Tue/Thu Chat' },
  { value: '/account', label: 'Account' },
];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function tomorrowISO() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminAnnouncements({ userProfile }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Add/Edit Announcement modal
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annDate, setAnnDate] = useState('');
  const [annAttachType, setAnnAttachType] = useState(null); // null | 'page' | 'url'
  const [annAttachValue, setAnnAttachValue] = useState('');
  const [annSendPush, setAnnSendPush] = useState(false);
  const [annSaving, setAnnSaving] = useState(false);

  // Send Push modal (standalone, no announcement created)
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushAttachType, setPushAttachType] = useState(null);
  const [pushAttachValue, setPushAttachValue] = useState('');
  const [pushSending, setPushSending] = useState(false);
  const [pushSent, setPushSent] = useState(false);

  async function loadAnnouncements() {
    const snap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')));
    setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  // loadAnnouncements() is async and reused after save/delete; its setState
  // calls happen after the await, not synchronously here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAnnouncements(); }, []);

  // ── Add/Edit Announcement ──────────────────────────────────────────────────

  function openAddAnnModal() {
    setEditingAnn(null);
    setAnnTitle('');
    setAnnBody('');
    setAnnDate('');
    setAnnAttachType(null);
    setAnnAttachValue('');
    setAnnSendPush(false);
    setShowAnnModal(true);
  }

  function openEditAnnModal(ann) {
    setEditingAnn(ann);
    setAnnTitle(ann.title);
    setAnnBody(ann.body);
    setAnnDate(ann.eventDate || '');
    setAnnAttachType(ann.linkType || null);
    setAnnAttachValue(ann.linkValue || '');
    setAnnSendPush(false); // don't re-send push on edit by default
    setShowAnnModal(true);
  }

  async function handleSaveAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) return;
    setAnnSaving(true);
    try {
      const data = {
        title: annTitle.trim(),
        body: annBody.trim(),
        eventDate: annDate || null,
        linkType: annAttachType,
        linkValue: annAttachType ? annAttachValue.trim() : null,
      };

      if (editingAnn) {
        await updateDoc(doc(db, 'announcements', editingAnn.id), data);
      } else {
        const created = await addDoc(collection(db, 'announcements'), {
          ...data,
          authorName: userProfile?.name || 'Admin',
          authorId: userProfile?.uid || null,
          pushSent: annSendPush,
          createdAt: serverTimestamp(),
        });

        if (annSendPush) {
          await triggerNotification('announcement', {
            announcementId: created.id,
            title: annTitle.trim(),
            body: annBody.trim(),
            createdBy: userProfile?.uid || null,
          });
        }
      }
      setShowAnnModal(false);
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      alert("Couldn't save the announcement. Please try again.");
    } finally {
      setAnnSaving(false);
    }
  }

  async function handleDeleteAnnouncement(ann) {
    if (!confirm(`Delete "${ann.title}"?`)) return;
    setDeletingId(ann.id);
    try {
      await deleteDoc(doc(db, 'announcements', ann.id));
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      alert("Couldn't delete the announcement. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Send Push (standalone) ─────────────────────────────────────────────────

  function openPushModal() {
    setPushTitle('');
    setPushBody('');
    setPushAttachType(null);
    setPushAttachValue('');
    setPushSent(false);
    setShowPushModal(true);
  }

  async function handleSendPush() {
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setPushSending(true);
    try {
      await addDoc(collection(db, 'pushAlerts'), {
        title: pushTitle.trim(),
        body: pushBody.trim(),
        linkType: pushAttachType,
        linkValue: pushAttachType ? pushAttachValue.trim() : null,
        sentBy: userProfile?.name || 'Admin',
        sentAt: serverTimestamp(),
      });

      await triggerNotification('announcement', {
        announcementId: null,
        title: pushTitle.trim(),
        body: pushBody.trim(),
        createdBy: userProfile?.uid || null,
      });

      setPushSent(true);
    } catch (err) {
      console.error('Failed to send push:', err);
    } finally {
      setPushSending(false);
    }
  }

  return (
    <Page>
      <TopRow>
        <Title>Announcements</Title>
        <BtnRow>
          <PushBtn onClick={openPushModal}>📤 Send Push</PushBtn>
          <AddBtn onClick={openAddAnnModal}>+ Add Announcement</AddBtn>
        </BtnRow>
      </TopRow>
      <Sub>{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</Sub>

      {loading ? (
        <Empty>Loading…</Empty>
      ) : announcements.length === 0 ? (
        <Empty>No announcements yet — click "+ Add Announcement" to create one.</Empty>
      ) : (
        announcements.map(ann => (
          <Card key={ann.id}>
            <CardTop>
              <div style={{ flex: 1 }}>
                <CardTitle>{ann.title}</CardTitle>
                <CardBody>{ann.body}</CardBody>
                <CardMeta>{ann.authorName} · {formatDate(ann.createdAt)}</CardMeta>
                <Tags>
                  {ann.eventDate && <Tag>📅 {ann.eventDate}</Tag>}
                  {ann.linkType && <Tag>🔗 {ann.linkType === 'page' ? 'Page link' : 'URL link'}</Tag>}
                  {ann.pushSent && <Tag>📤 Push sent</Tag>}
                </Tags>
              </div>
              <Actions>
                <IconBtn onClick={() => openEditAnnModal(ann)} aria-label="Edit" disabled={deletingId === ann.id}>✎</IconBtn>
                <IconBtn onClick={() => handleDeleteAnnouncement(ann)} aria-label="Delete" disabled={deletingId === ann.id}>
                  {deletingId === ann.id ? '…' : '✕'}
                </IconBtn>
              </Actions>
            </CardTop>
          </Card>
        ))
      )}

      {/* ── Add/Edit Announcement Modal ── */}
      {showAnnModal && (
        <Modal onClick={e => e.target === e.currentTarget && !annSaving && setShowAnnModal(false)}>
          <ModalCard>
            <h2>{editingAnn ? 'Edit Announcement' : 'Add Announcement'}</h2>

            <Field>
              <label>Title</label>
              <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="e.g. Class moved to Thursday" autoFocus />
            </Field>

            <Field>
              <label>Details</label>
              <textarea value={annBody} onChange={e => setAnnBody(e.target.value)} placeholder="Write the announcement details…" />
            </Field>

            <Field>
              <label>Date (optional)</label>
              <input type="date" value={annDate} onChange={e => setAnnDate(e.target.value)} />
              <DatePresets>
                <PresetBtn onClick={() => setAnnDate(todayISO())}>Today</PresetBtn>
                <PresetBtn onClick={() => setAnnDate(tomorrowISO())}>Tomorrow</PresetBtn>
                <PresetBtn onClick={() => setAnnDate('')}>Clear</PresetBtn>
              </DatePresets>
            </Field>

            <Field>
              <label>Attach a Page or Link (optional)</label>
              <AttachToggle>
                <AttachOption $active={annAttachType === null} onClick={() => { setAnnAttachType(null); setAnnAttachValue(''); }}>None</AttachOption>
                <AttachOption $active={annAttachType === 'page'} onClick={() => { setAnnAttachType('page'); setAnnAttachValue(PAGE_OPTIONS[0].value); }}>App Page</AttachOption>
                <AttachOption $active={annAttachType === 'url'} onClick={() => { setAnnAttachType('url'); setAnnAttachValue(''); }}>Custom URL</AttachOption>
              </AttachToggle>

              {annAttachType === 'page' && (
                <select value={annAttachValue} onChange={e => setAnnAttachValue(e.target.value)}>
                  {PAGE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              )}
              {annAttachType === 'url' && (
                <input
                  type="url"
                  value={annAttachValue}
                  onChange={e => setAnnAttachValue(e.target.value)}
                  placeholder="https://example.com"
                />
              )}
            </Field>

            
            {!editingAnn && (
              <ToggleRow>
                <input type="checkbox" checked={annSendPush} onChange={e => setAnnSendPush(e.target.checked)} />
                Send push notification alert
              </ToggleRow>
            )}

            <ModalBtns>
              <CancelBtn onClick={() => setShowAnnModal(false)} disabled={annSaving}>Cancel</CancelBtn>
              <SaveBtn onClick={handleSaveAnnouncement} disabled={annSaving || !annTitle.trim() || !annBody.trim()}>
                {annSaving ? 'Saving…' : editingAnn ? 'Save Changes' : 'Post Announcement'}
              </SaveBtn>
            </ModalBtns>
          </ModalCard>
        </Modal>
      )}

      {/* ── Send Push Modal (standalone) ── */}
      {showPushModal && (
        <Modal onClick={e => e.target === e.currentTarget && !pushSending && setShowPushModal(false)}>
          <ModalCard>
            <h2>Send Push Notification</h2>

            {pushSent ? (
              <>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  ✅ Push notification sent to all approved students.
                </p>
                <ModalBtns>
                  <SaveBtn onClick={() => setShowPushModal(false)}>Done</SaveBtn>
                </ModalBtns>
              </>
            ) : (
              <>
                <Field>
                  <label>Title</label>
                  <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="e.g. Class cancelled today" autoFocus />
                </Field>

                <Field>
                  <label>Contents</label>
                  <textarea value={pushBody} onChange={e => setPushBody(e.target.value)} placeholder="What should the notification say?" style={{ minHeight: '70px' }} />
                </Field>

                <Field>
                  <label>Where should it go when tapped? (optional)</label>
                  <AttachToggle>
                    <AttachOption $active={pushAttachType === null} onClick={() => { setPushAttachType(null); setPushAttachValue(''); }}>None</AttachOption>
                    <AttachOption $active={pushAttachType === 'page'} onClick={() => { setPushAttachType('page'); setPushAttachValue(PAGE_OPTIONS[0].value); }}>App Page</AttachOption>
                    <AttachOption $active={pushAttachType === 'url'} onClick={() => { setPushAttachType('url'); setPushAttachValue(''); }}>Custom URL</AttachOption>
                  </AttachToggle>

                  {pushAttachType === 'page' && (
                    <select value={pushAttachValue} onChange={e => setPushAttachValue(e.target.value)}>
                      {PAGE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  )}
                  {pushAttachType === 'url' && (
                    <input
                      type="url"
                      value={pushAttachValue}
                      onChange={e => setPushAttachValue(e.target.value)}
                      placeholder="https://example.com"
                    />
                  )}
                </Field>

                <ModalBtns>
                  <CancelBtn onClick={() => setShowPushModal(false)} disabled={pushSending}>Cancel</CancelBtn>
                  <SaveBtn onClick={handleSendPush} disabled={pushSending || !pushTitle.trim() || !pushBody.trim()}>
                    {pushSending ? 'Sending…' : 'Send Push'}
                  </SaveBtn>
                </ModalBtns>
              </>
            )}
          </ModalCard>
        </Modal>
      )}
    </Page>
  );
}