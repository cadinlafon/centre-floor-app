import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  collection, doc, getDocs, addDoc, updateDoc, query, where, orderBy,
  arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toDate } from '../utils/dates';
import { triggerNotification } from '../utils/notifyServer';

// ─── Styles ──────────────────────────────────────────────────────────────────

const Page = styled.div`padding: 1.25rem; max-width: 600px; margin: 0 auto;`;
const PageTitle = styled.h1`font-family: Georgia, serif; font-size: 1.4rem; color: var(--brown-dark); margin: 0 0 0.25rem;`;
const PageSub = styled.p`font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1.25rem;`;

const Tabs = styled.div`
  display: flex; border-bottom: 2px solid var(--border); margin-bottom: 1.25rem;
`;
const Tab = styled.button`
  flex: 1; padding: 0.7rem; border: none; background: none;
  font-size: 0.9rem; font-weight: ${p => p.$active ? '700' : '500'};
  color: ${p => p.$active ? 'var(--brown-dark)' : 'var(--text-muted)'};
  border-bottom: 2.5px solid ${p => p.$active ? 'var(--amber)' : 'transparent'};
  margin-bottom: -2px; cursor: pointer; transition: all 0.2s;
`;

const Form = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border);
  border-radius: 16px; padding: 1.25rem; margin-bottom: 1.5rem;
  box-shadow: 0 2px 10px var(--shadow);
`;
const FormTitle = styled.h3`font-family: Georgia, serif; font-size: 1rem; color: var(--brown-dark); margin: 0 0 1rem;`;
const Field = styled.div`
  margin-bottom: 0.9rem;
  label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem; }
  input, textarea, select {
    width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid var(--border);
    border-radius: 9px; font-size: 0.9rem; background: var(--bg-secondary);
    color: var(--text-primary); box-sizing: border-box; font-family: inherit;
    &:focus { outline: none; border-color: var(--amber); }
  }
  textarea { min-height: 80px; resize: vertical; line-height: 1.45; }
`;
const SubmitBtn = styled.button`
  width: 100%; padding: 0.8rem; background: linear-gradient(135deg, #78350f, #d97706);
  color: white; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s; margin-top: 0.25rem;
  &:hover { opacity: 0.9; } &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const SuccessMsg = styled.div`
  text-align: center; padding: 1.5rem; background: #f0fdf4; border: 1.5px solid #bbf7d0;
  border-radius: 12px; color: #166534; font-size: 0.9rem; margin-bottom: 1rem;
`;

const SectionLabel = styled.p`
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-muted); margin: 0;
`;
const SectionHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  margin-bottom: 0.75rem;
`;
const Toolbar = styled.div`
  display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1rem;
`;
const SearchInput = styled.input`
  flex: 1 1 180px; min-width: 0; padding: 0.65rem 0.85rem; border: 1.5px solid var(--border);
  border-radius: 999px; font-size: 0.9rem; background: var(--bg-card); color: var(--text-primary);
  &:focus { outline: none; border-color: var(--amber); }
`;
const SortSelect = styled.select`
  padding: 0.65rem 0.85rem; border: 1.5px solid var(--border); border-radius: 999px;
  font-size: 0.85rem; background: var(--bg-card); color: var(--text-primary);
  &:focus { outline: none; border-color: var(--amber); }
`;
const AddFab = styled.button`
  display: inline-flex; align-items: center; justify-content: center; width: 2.2rem; height: 2.2rem;
  border: none; border-radius: 50%; background: linear-gradient(135deg, #78350f, #d97706);
  color: white; font-size: 1.15rem; cursor: pointer; box-shadow: 0 2px 8px var(--shadow);
  &:hover { opacity: 0.95; }
`;

// ── Submission cards ──────────────────────────────────────────────────────────

const Card = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 14px;
  padding: 1rem 1.1rem; margin-bottom: 0.75rem; box-shadow: 0 1px 6px var(--shadow);
`;
const CardTop = styled.div`display: flex; align-items: flex-start; gap: 0.75rem;`;
const CardMain = styled.div`flex: 1; min-width: 0;`;
const CardTitle = styled.h3`font-size: 0.95rem; color: var(--text-primary); margin: 0 0 0.25rem;`;
const CardBody = styled.p`font-size: 0.825rem; color: var(--text-secondary); margin: 0; line-height: 1.4;`;
const CardMeta = styled.p`font-size: 0.7rem; color: var(--text-muted); margin: 0.5rem 0 0;`;

const StatusBadge = styled.span`
  display: inline-block; padding: 0.2rem 0.6rem; border-radius: 20px;
  font-size: 0.7rem; font-weight: 700; white-space: nowrap; flex-shrink: 0;
  background: ${p =>
    p.$s === 'completed' ? '#dcfce7' :
    p.$s === 'in-progress' ? '#dbeafe' :
    p.$s === 'inspecting' ? '#fef3c7' :
    p.$s === 'planning' ? '#ede9fe' :
    p.$s === 'rejected' ? '#fee2e2' :
    '#f3f4f6'};
  color: ${p =>
    p.$s === 'completed' ? '#166534' :
    p.$s === 'in-progress' ? '#1d4ed8' :
    p.$s === 'inspecting' ? '#92400e' :
    p.$s === 'planning' ? '#5b21b6' :
    p.$s === 'rejected' ? '#dc2626' :
    '#6b7280'};
`;

const SeverityDot = styled.span`
  display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.3rem;
  background: ${p =>
    p.$s === 'critical' ? '#dc2626' :
    p.$s === 'high' ? '#f97316' :
    p.$s === 'medium' ? '#f59e0b' : '#6b7280'};
`;

const UpvoteBtn = styled.button`
  display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
  background: ${p => p.$voted ? '#fef3c7' : 'var(--bg-secondary)'};
  border: 1.5px solid ${p => p.$voted ? 'var(--amber)' : 'var(--border)'};
  border-radius: 10px; padding: 0.4rem 0.6rem; cursor: ${p => p.$disabled ? 'default' : 'pointer'};
  transition: all 0.2s; flex-shrink: 0;
  &:hover { border-color: var(--amber); }
`;
const UpvoteCount = styled.span`font-size: 0.9rem; font-weight: 700; color: var(--brown-dark); line-height: 1;`;
const UpvoteLabel = styled.span`font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;`;

const Tags = styled.div`display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.5rem;`;
const Tag = styled.span`
  font-size: 0.68rem; padding: 0.15rem 0.55rem; border-radius: 20px;
  background: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border);
`;

const CommentToggle = styled.button`
  background: none; border: none; color: var(--text-muted); font-size: 0.78rem;
  font-weight: 600; cursor: pointer; padding: 0.4rem 0 0; display: flex; align-items: center; gap: 0.3rem;
  &:hover { color: var(--amber); }
`;
const CommentSection = styled.div`margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);`;
const CommentItem = styled.div`
  background: var(--bg-secondary); border-radius: 9px; padding: 0.5rem 0.75rem; margin-bottom: 0.4rem;
`;
const CommentAuthor = styled.span`font-size: 0.75rem; font-weight: 700; color: var(--text-primary);`;
const CommentTime = styled.span`font-size: 0.65rem; color: var(--text-muted); margin-left: 0.4rem;`;
const CommentText = styled.p`font-size: 0.82rem; color: var(--text-secondary); margin: 0.15rem 0 0; line-height: 1.4;`;
const CommentForm = styled.div`display: flex; gap: 0.4rem; margin-top: 0.6rem;`;
const CommentInput = styled.input`
  flex: 1; padding: 0.5rem 0.75rem; border: 1.5px solid var(--border); border-radius: 20px;
  font-size: 0.85rem; background: var(--bg-card); color: var(--text-primary);
  &:focus { outline: none; border-color: var(--amber); }
`;
const CommentSendBtn = styled.button`
  padding: 0.5rem 0.9rem; background: var(--amber); color: white; border: none;
  border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const BUG_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const BUG_PAGES = ['Home', 'Schedule', 'Class Chat', 'Mon/Wed Chat', 'Tue/Thu Chat', 'Announcements', 'Account', 'Login / Sign Up', 'Admin Panel', 'Other'];
const FEATURE_CATEGORIES = ['Chat', 'Schedule', 'Announcements', 'UI / Design', 'Admin Tools', 'Notifications', 'New Feature', 'Other'];

const BUG_STATUS_LABELS = {
  'new': 'New', 'inspecting': 'Inspecting Issue',
  'in-progress': 'In Progress', 'completed': 'Completed',
};
const FEATURE_STATUS_LABELS = {
  'new': 'New', 'in-review': 'In Review', 'planning': 'Planning',
  'in-progress': 'In Progress', 'rejected': 'Rejected', 'completed': 'Completed',
};

function formatTime(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function formatCommentTime(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportAndSuggest({ userProfile }) {
  const [activeTab, setActiveTab] = useState('bugs');

  // Bug form
  const [bugTitle, setBugTitle] = useState('');
  const [bugDetails, setBugDetails] = useState('');
  const [bugSeverity, setBugSeverity] = useState('Medium');
  const [bugPage, setBugPage] = useState('');
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugSubmitted, setBugSubmitted] = useState(false);

  // Feature form
  const [featCategory, setFeatCategory] = useState('New Feature');
  const [featTitle, setFeatTitle] = useState('');
  const [featDetails, setFeatDetails] = useState('');
  const [featHelps, setFeatHelps] = useState('');
  const [featSubmitting, setFeatSubmitting] = useState(false);
  const [featSubmitted, setFeatSubmitted] = useState(false);

  // Lists
  const [bugs, setBugs] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [loadingFeats, setLoadingFeats] = useState(true);
  const [showBugForm, setShowBugForm] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [bugSearch, setBugSearch] = useState('');
  const [bugSort, setBugSort] = useState('newest');
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureSort, setFeatureSort] = useState('newest');

  // Comments
  const [openComments, setOpenComments] = useState(null);
  const [commentsByDoc, setCommentsByDoc] = useState({});
  const [commentDraft, setCommentDraft] = useState('');

  const myUid = userProfile?.uid;

  function getTimeValue(ts) {
    const d = toDate(ts);
    return d ? d.getTime() : 0;
  }

  function getFilteredAndSortedBugs(items, searchTerm, sortMode) {
    const normalized = searchTerm.toLowerCase();
    const filtered = items.filter(item => {
      const haystack = [item.title, item.details, item.severity, item.page, item.authorName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });

    return [...filtered].sort((a, b) => {
      const aTime = getTimeValue(a.createdAt);
      const bTime = getTimeValue(b.createdAt);
      if (sortMode === 'oldest') return aTime - bTime;
      if (sortMode === 'trending') return (bTime - aTime);
      return bTime - aTime;
    });
  }

  function getFilteredAndSortedFeatures(items, searchTerm, sortMode) {
    const normalized = searchTerm.toLowerCase();
    const filtered = items.filter(item => {
      const haystack = [item.title, item.details, item.howItHelps, item.category, item.authorName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });

    return [...filtered].sort((a, b) => {
      const aTime = getTimeValue(a.createdAt);
      const bTime = getTimeValue(b.createdAt);
      const aVotes = a.upvotes?.length || 0;
      const bVotes = b.upvotes?.length || 0;
      if (sortMode === 'oldest') return aTime - bTime;
      if (sortMode === 'trending') return (bVotes - aVotes) || (bTime - aTime);
      return bTime - aTime;
    });
  }

  async function loadBugs() {
    const snap = await getDocs(query(collection(db, 'bugReports'), orderBy('createdAt', 'desc')));
    setBugs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoadingBugs(false);
  }

  async function loadFeatures() {
    const snap = await getDocs(query(collection(db, 'featureSuggestions'), orderBy('createdAt', 'desc')));
    setFeatures(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoadingFeats(false);
  }

  // loadBugs/loadFeatures are async and reused after every submit/comment;
  // their setState calls happen after the await, not synchronously here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadBugs(); loadFeatures(); }, []);

  // ── Submit bug ─────────────────────────────────────────────────────────────

  async function handleSubmitBug() {
    if (!bugTitle.trim() || !bugDetails.trim()) return;
    setBugSubmitting(true);
    try {
      await addDoc(collection(db, 'bugReports'), {
        title: bugTitle.trim(),
        details: bugDetails.trim(),
        severity: bugSeverity,
        page: bugPage || null,
        authorName: userProfile?.name || 'Student',
        authorId: myUid,
        status: 'new',
        createdAt: serverTimestamp(),
      });
      await triggerNotification('bug-feature-submitted', {
        kind: 'bug',
        title: bugTitle.trim(),
        authorName: userProfile?.name || 'Student',
      });
      setBugTitle(''); setBugDetails(''); setBugSeverity('Medium'); setBugPage('');
      setBugSubmitted(true);
      setShowBugForm(false);
      await loadBugs();
      setTimeout(() => setBugSubmitted(false), 4000);
    } catch (err) { console.error(err); }
    finally { setBugSubmitting(false); }
  }

  // ── Submit feature ─────────────────────────────────────────────────────────

  async function handleSubmitFeature() {
    if (!featTitle.trim() || !featDetails.trim()) return;
    setFeatSubmitting(true);
    try {
      await addDoc(collection(db, 'featureSuggestions'), {
        category: featCategory,
        title: featTitle.trim(),
        details: featDetails.trim(),
        howItHelps: featHelps.trim() || null,
        authorName: userProfile?.name || 'Student',
        authorId: myUid,
        status: 'new',
        upvotes: [],
        createdAt: serverTimestamp(),
      });
      await triggerNotification('bug-feature-submitted', {
        kind: 'feature',
        title: featTitle.trim(),
        authorName: userProfile?.name || 'Student',
      });
      setFeatCategory('New Feature'); setFeatTitle(''); setFeatDetails(''); setFeatHelps('');
      setFeatSubmitted(true);
      setShowFeatureForm(false);
      await loadFeatures();
      setTimeout(() => setFeatSubmitted(false), 4000);
    } catch (err) { console.error(err); }
    finally { setFeatSubmitting(false); }
  }

  // ── Upvote ─────────────────────────────────────────────────────────────────

  async function handleUpvote(feature) {
    if (feature.authorId === myUid) return; // can't upvote own
    const alreadyUpvoted = feature.upvotes?.includes(myUid);
    try {
      // Firestore's arrayUnion/arrayRemove are atomic server-side, so this
      // can't race under concurrent upvotes the way a plain read-modify-write
      // would — no separate RPC needed, unlike the Postgres array column.
      await updateDoc(doc(db, 'featureSuggestions', feature.id), {
        upvotes: alreadyUpvoted ? arrayRemove(myUid) : arrayUnion(myUid),
      });
      await loadFeatures();
    } catch (err) {
      console.error(err);
    }
  }

  // ── Comments ───────────────────────────────────────────────────────────────
  // Bug/feature comments are separate flat collections (not Firestore
  // subcollections), so each kind needs its own foreign-key field.

  const COMMENT_CONFIG = {
    bugReports: { collection: 'bugReportComments', fk: 'bugReportId' },
    featureSuggestions: { collection: 'featureSuggestionComments', fk: 'featureSuggestionId' },
  };

  async function loadComments(collName, docId) {
    const { collection: colName, fk } = COMMENT_CONFIG[collName];
    const snap = await getDocs(
      query(collection(db, colName), where(fk, '==', docId), orderBy('createdAt', 'asc'))
    );
    setCommentsByDoc(prev => ({ ...prev, [docId]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
  }

  function toggleComments(collName, docId) {
    if (openComments === docId) {
      setOpenComments(null);
    } else {
      setOpenComments(docId);
      if (!commentsByDoc[docId]) loadComments(collName, docId);
    }
  }

  async function handlePostComment(collName, docId) {
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    const { collection: colName, fk } = COMMENT_CONFIG[collName];
    try {
      await addDoc(collection(db, colName), {
        [fk]: docId,
        text: trimmed,
        authorName: userProfile?.name || 'Student',
        authorId: myUid,
        createdAt: serverTimestamp(),
      });
      setCommentDraft('');
      await loadComments(collName, docId);
    } catch {
      // no-op, matches the prior silent-failure behavior
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Page>
      <PageTitle>Report & Suggest</PageTitle>
      <PageSub>Found a bug or have an idea? Let us know!</PageSub>

      <Tabs>
        <Tab $active={activeTab === 'bugs'} onClick={() => setActiveTab('bugs')}>🐛 Bug Reports</Tab>
        <Tab $active={activeTab === 'features'} onClick={() => setActiveTab('features')}>💡 Suggestions</Tab>
      </Tabs>

      {/* ── Bug Reports Tab ── */}
      {activeTab === 'bugs' && (
        <>
          {bugSubmitted && <SuccessMsg>✅ Bug report submitted! Thank you for helping improve the app.</SuccessMsg>}

          <SectionHeader>
            <SectionLabel>Reported Bugs</SectionLabel>
            <AddFab onClick={() => setShowBugForm(prev => !prev)} aria-label={showBugForm ? 'Hide bug form' : 'Add bug report'}>
              {showBugForm ? '−' : '+'}
            </AddFab>
          </SectionHeader>

          {showBugForm && (
            <Form>
              <FormTitle>Report a Bug</FormTitle>
              <Field>
                <label>Title</label>
                <input value={bugTitle} onChange={e => setBugTitle(e.target.value)} placeholder="Short description of the bug" />
              </Field>
              <Field>
                <label>Details</label>
                <textarea value={bugDetails} onChange={e => setBugDetails(e.target.value)} placeholder="What happened? What were you trying to do?" />
              </Field>
              <Field>
                <label>Severity</label>
                <select value={bugSeverity} onChange={e => setBugSeverity(e.target.value)}>
                  {BUG_SEVERITIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field>
                <label>Which page? (optional)</label>
                <select value={bugPage} onChange={e => setBugPage(e.target.value)}>
                  <option value="">— Select a page —</option>
                  {BUG_PAGES.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <SubmitBtn onClick={handleSubmitBug} disabled={bugSubmitting || !bugTitle.trim() || !bugDetails.trim()}>
                {bugSubmitting ? 'Submitting…' : 'Submit Bug Report'}
              </SubmitBtn>
            </Form>
          )}

          <Toolbar>
            <SearchInput
              value={bugSearch}
              onChange={e => setBugSearch(e.target.value)}
              placeholder="Search bug reports"
            />
            <SortSelect value={bugSort} onChange={e => setBugSort(e.target.value)}>
              <option value="newest">Newest to oldest</option>
              <option value="oldest">Oldest to newest</option>
              <option value="trending">Trending</option>
            </SortSelect>
          </Toolbar>

          {loadingBugs ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
          ) : getFilteredAndSortedBugs(bugs, bugSearch, bugSort).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No bug reports match your search.</p>
          ) : (
            getFilteredAndSortedBugs(bugs, bugSearch, bugSort).map(bug => (
              <Card key={bug.id}>
                <CardTop>
                  <CardMain>
                    <CardTitle>
                      <SeverityDot $s={bug.severity?.toLowerCase()} />
                      {bug.title}
                    </CardTitle>
                    <CardBody>{bug.details}</CardBody>
                    <Tags>
                      <Tag>{bug.severity}</Tag>
                      {bug.page && <Tag>{bug.page}</Tag>}
                    </Tags>
                    <CardMeta>{bug.authorName} · {formatTime(bug.createdAt)}</CardMeta>
                  </CardMain>
                  <StatusBadge $s={bug.status}>
                    {BUG_STATUS_LABELS[bug.status] || bug.status}
                  </StatusBadge>
                </CardTop>
                <CommentToggle onClick={() => toggleComments('bugReports', bug.id)}>
                  💬 {openComments === bug.id ? 'Hide' : 'Comments'}
                  {commentsByDoc[bug.id] ? ` (${commentsByDoc[bug.id].length})` : ''}
                </CommentToggle>
                {openComments === bug.id && (
                  <CommentSection>
                    {(commentsByDoc[bug.id] || []).map(c => (
                      <CommentItem key={c.id}>
                        <div><CommentAuthor>{c.authorName}</CommentAuthor><CommentTime>{formatCommentTime(c.createdAt)}</CommentTime></div>
                        <CommentText>{c.text}</CommentText>
                      </CommentItem>
                    ))}
                    {(commentsByDoc[bug.id] || []).length === 0 && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>No comments yet.</p>
                    )}
                    <CommentForm>
                      <CommentInput
                        placeholder="Add a comment…"
                        value={commentDraft}
                        onChange={e => setCommentDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handlePostComment('bugReports', bug.id); }}
                      />
                      <CommentSendBtn onClick={() => handlePostComment('bugReports', bug.id)} disabled={!commentDraft.trim()}>
                        Post
                      </CommentSendBtn>
                    </CommentForm>
                  </CommentSection>
                )}
              </Card>
            ))
          )}
        </>
      )}

      {/* ── Feature Suggestions Tab ── */}
      {activeTab === 'features' && (
        <>
          {featSubmitted && <SuccessMsg>✅ Feature suggestion submitted! Thanks for the idea.</SuccessMsg>}

          <SectionHeader>
            <SectionLabel>Feature Suggestions</SectionLabel>
            <AddFab onClick={() => setShowFeatureForm(prev => !prev)} aria-label={showFeatureForm ? 'Hide feature form' : 'Add feature suggestion'}>
              {showFeatureForm ? '−' : '+'}
            </AddFab>
          </SectionHeader>

          {showFeatureForm && (
            <Form>
              <FormTitle>Suggest a Feature</FormTitle>
              <Field>
                <label>Category</label>
                <select value={featCategory} onChange={e => setFeatCategory(e.target.value)}>
                  {FEATURE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field>
                <label>Title</label>
                <input value={featTitle} onChange={e => setFeatTitle(e.target.value)} placeholder="Short name for your idea" />
              </Field>
              <Field>
                <label>Details</label>
                <textarea value={featDetails} onChange={e => setFeatDetails(e.target.value)} placeholder="Describe the feature and how it should work" />
              </Field>
              <Field>
                <label>How would this help? (optional)</label>
                <input value={featHelps} onChange={e => setFeatHelps(e.target.value)} placeholder="e.g. It would save time when…" />
              </Field>
              <SubmitBtn onClick={handleSubmitFeature} disabled={featSubmitting || !featTitle.trim() || !featDetails.trim()}>
                {featSubmitting ? 'Submitting…' : 'Submit Suggestion'}
              </SubmitBtn>
            </Form>
          )}

          <Toolbar>
            <SearchInput
              value={featureSearch}
              onChange={e => setFeatureSearch(e.target.value)}
              placeholder="Search suggestions"
            />
            <SortSelect value={featureSort} onChange={e => setFeatureSort(e.target.value)}>
              <option value="newest">Newest to oldest</option>
              <option value="oldest">Oldest to newest</option>
              <option value="trending">Trending</option>
            </SortSelect>
          </Toolbar>

          {loadingFeats ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
          ) : getFilteredAndSortedFeatures(features, featureSearch, featureSort).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No suggestions match your search.</p>
          ) : (
            getFilteredAndSortedFeatures(features, featureSearch, featureSort).map(feat => {
              const hasVoted = feat.upvotes?.includes(myUid);
              const isOwn = feat.authorId === myUid;
              return (
                <Card key={feat.id}>
                  <CardTop>
                    <UpvoteBtn
                      $voted={hasVoted}
                      $disabled={isOwn}
                      onClick={() => !isOwn && handleUpvote(feat)}
                      title={isOwn ? "Can't upvote your own suggestion" : hasVoted ? 'Remove upvote' : 'Upvote'}
                    >
                      <UpvoteCount>▲</UpvoteCount>
                      <UpvoteCount>{feat.upvotes?.length || 0}</UpvoteCount>
                      <UpvoteLabel>votes</UpvoteLabel>
                    </UpvoteBtn>
                    <CardMain>
                      <CardTitle>{feat.title}</CardTitle>
                      <CardBody>{feat.details}</CardBody>
                      {feat.howItHelps && (
                        <CardBody style={{ marginTop: '0.3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          "{feat.howItHelps}"
                        </CardBody>
                      )}
                      <Tags>
                        <Tag>{feat.category}</Tag>
                      </Tags>
                      <CardMeta>{feat.authorName} · {formatTime(feat.createdAt)}</CardMeta>
                    </CardMain>
                    <StatusBadge $s={feat.status}>
                      {FEATURE_STATUS_LABELS[feat.status] || feat.status}
                    </StatusBadge>
                  </CardTop>
                  <CommentToggle onClick={() => toggleComments('featureSuggestions', feat.id)}>
                    💬 {openComments === feat.id ? 'Hide' : 'Comments'}
                    {commentsByDoc[feat.id] ? ` (${commentsByDoc[feat.id].length})` : ''}
                  </CommentToggle>
                  {openComments === feat.id && (
                    <CommentSection>
                      {(commentsByDoc[feat.id] || []).map(c => (
                        <CommentItem key={c.id}>
                          <div><CommentAuthor>{c.authorName}</CommentAuthor><CommentTime>{formatCommentTime(c.createdAt)}</CommentTime></div>
                          <CommentText>{c.text}</CommentText>
                        </CommentItem>
                      ))}
                      {(commentsByDoc[feat.id] || []).length === 0 && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>No comments yet.</p>
                      )}
                      <CommentForm>
                        <CommentInput
                          placeholder="Add a comment…"
                          value={commentDraft}
                          onChange={e => setCommentDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handlePostComment('featureSuggestions', feat.id); }}
                        />
                        <CommentSendBtn onClick={() => handlePostComment('featureSuggestions', feat.id)} disabled={!commentDraft.trim()}>
                          Post
                        </CommentSendBtn>
                      </CommentForm>
                    </CommentSection>
                  )}
                </Card>
              );
            })
          )}
        </>
      )}
    </Page>
  );
}