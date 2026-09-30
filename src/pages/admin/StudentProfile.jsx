import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection, doc, getDocs, query, where, updateDoc, deleteDoc, limit, orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toDate } from '../../utils/dates';
import { uidToToken } from '../../utils/tokens';
import { triggerNotification } from '../../utils/notifyServer';
import styled from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '../../components/AdminLayout';

// ─── Styles ──────────────────────────────────────────────────────────────────

const Page = styled.div`
  max-width: 760px;
  margin: 0 auto;
`;

const BackBtn = styled.button`
  background: none; border: none; color: var(--text-muted); font-size: 0.875rem;
  cursor: pointer; padding: 0; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.3rem;
  font-weight: 600;
  transition: color 0.15s;
  &:hover { color: var(--amber); }
`;

const SectionLabel = styled.p`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0 0 0.6rem;
`;

const Header = styled.div`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 18px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 12px var(--shadow);
  overflow: hidden;
`;

const HeaderBanner = styled.div`
  height: 72px;
  background: linear-gradient(135deg, #78350f 0%, #d97706 100%);
`;

const HeaderBody = styled.div`
  padding: 0 1.75rem 1.75rem;
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  flex-wrap: wrap;
`;

const PhotoCircle = styled.div`
  width: 92px;
  height: 92px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid var(--bg-card);
  box-shadow: 0 2px 8px var(--shadow);
  flex-shrink: 0;
  margin-top: -46px;
  background: linear-gradient(135deg, #78350f, #d97706);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const PhotoFallback = styled.span`
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2rem;
  font-weight: 700;
  color: white;
`;

const HeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
  padding-top: 0.9rem;
`;

const Name = styled.h1`
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.5rem;
  color: var(--brown-dark);
  margin: 0 0 0.2rem;
`;

const Email = styled.p`
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 0.7rem;
`;

const TagRow = styled.div`display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.9rem;`;

const Tag = styled.span`
  font-size: 0.72rem; font-weight: 700; padding: 0.22rem 0.7rem; border-radius: 20px;
  background: ${p => p.$bg || 'var(--bg-secondary)'};
  color: ${p => p.$color || 'var(--text-muted)'};
  border: 1px solid ${p => p.$border || 'var(--border)'};
`;

const ActionRow = styled.div`display: flex; gap: 0.5rem; flex-wrap: wrap;`;

const Btn = styled.button`
  padding: 0.45rem 0.95rem; border-radius: 8px; font-size: 0.78rem; font-weight: 600;
  cursor: pointer; border: none; transition: opacity 0.2s, box-shadow 0.2s;
  &:hover { box-shadow: 0 1px 6px var(--shadow); }
  &:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
`;
const EditClassBtn = styled(Btn)`background: #e0f2fe; color: #0369a1;`;
const AdminBtn    = styled(Btn)`background: #fef3c7; color: #92400e;`;
const RemoveBtn   = styled(Btn)`background: #fee2e2; color: #dc2626;`;

const StatsGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem; margin-bottom: 1.5rem;
`;
const StatCard = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 14px;
  padding: 1rem; box-shadow: 0 1px 6px var(--shadow); text-align: center;
  transition: border-color 0.2s, box-shadow 0.2s;
  &:hover { border-color: var(--amber); box-shadow: 0 2px 10px var(--shadow); }
`;
const StatIcon = styled.div`font-size: 1.15rem; margin-bottom: 0.2rem;`;
const StatNum = styled.div`font-family: Georgia, serif; font-size: 1.6rem; font-weight: 700; color: var(--brown-dark);`;
const StatLabel = styled.div`font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;`;

const Section = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 16px;
  padding: 1.25rem 1.25rem 1.5rem; margin-bottom: 1.25rem; box-shadow: 0 1px 6px var(--shadow);
`;
const SectionTitle = styled.h3`
  font-family: Georgia, serif; font-size: 1rem; color: var(--brown-dark); margin: 0 0 1rem;
  display: flex; align-items: center; gap: 0.45rem;
`;

const MsgList = styled.div`display: flex; flex-direction: column; gap: 0.5rem; max-height: 360px; overflow-y: auto;`;
const MsgItem = styled.div`
  background: var(--bg-secondary); border-radius: 10px; padding: 0.6rem 0.85rem;
  border-left: 3px solid var(--amber);
`;
const MsgTop = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.2rem;`;
const MsgRoom = styled.span`
  font-size: 0.68rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 20px;
  background: #fef3c7; color: #92400e;
`;
const MsgTime = styled.span`font-size: 0.65rem; color: var(--text-muted);`;
const MsgText = styled.p`font-size: 0.85rem; color: var(--text-primary); margin: 0; line-height: 1.4;`;

const Empty = styled.p`color: var(--text-muted); font-size: 0.875rem; text-align: center; padding: 1.5rem 0;`;

const Modal = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem;
`;
const ModalCard = styled.div`
  background: var(--bg-card); border-radius: 16px; padding: 1.75rem;
  width: 100%; max-width: 340px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  h2 { font-family: Georgia, serif; color: var(--brown-dark); margin: 0 0 1rem; font-size: 1.1rem; }
`;
const Select = styled.select`
  width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid var(--border); border-radius: 9px;
  font-size: 0.9rem; background: var(--bg-secondary); color: var(--text-primary);
  box-sizing: border-box; margin-bottom: 1rem;
  &:focus { outline: none; border-color: var(--amber); }
`;
const ModalBtns = styled.div`display: flex; gap: 0.75rem;`;
const SaveBtn   = styled(Btn)`flex: 1; background: linear-gradient(135deg, #78350f, #d97706); color: white; padding: 0.65rem; font-size: 0.875rem;`;
const CancelBtn = styled(Btn)`flex: 1; background: var(--bg-secondary); color: var(--text-secondary); border: 1.5px solid var(--border); padding: 0.65rem; font-size: 0.875rem;`;

const ClassReqCard = styled.div`
  background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 16px;
  padding: 1.1rem 1.25rem; margin-bottom: 1.25rem; box-shadow: 0 1px 6px var(--shadow);
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
`;
const ClassReqInfo = styled.div`flex: 1; min-width: 220px;`;
const ClassReqTitle = styled.p`font-family: Georgia, serif; font-size: 1rem; color: #92400e; margin: 0 0 0.3rem;`;
const ClassReqBody = styled.p`font-size: 0.85rem; color: var(--text-primary); margin: 0; line-height: 1.4;`;
const ClassReqActions = styled.div`display: flex; gap: 0.5rem; flex-shrink: 0;`;

const CenteredNote = styled.p`
  color: var(--text-muted);
  padding: 3rem 0;
  text-align: center;
  font-size: 0.9rem;
`;

// ─── Constants ───────────────────────────────────────────────────────────────

const ROOM_LABELS = { 'class-chat': 'Class Chat', 'mon-wed': 'Mon/Wed', 'tue-thu': 'Tue/Thu' };

const classLabel = c =>
  c === 'monwed' ? 'Mon / Wed' :
  c === 'tuethu' ? 'Tue / Thu' :
  c === 'both'   ? 'Both Classes' : '—';

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

function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMsgTime(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function memberSince(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentProfile({ userProfile: adminProfile }) {
  const { token } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const [showEditClass, setShowEditClass] = useState(false);
  const [newClass, setNewClass] = useState('monwed');
  const [busy, setBusy] = useState(false);
  const [adminToggleBusy, setAdminToggleBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);

  const [pendingClassReq, setPendingClassReq] = useState(null);
  const [classReqBusy, setClassReqBusy] = useState(false);

  const isViewerAdmin = ['admin', 'superadmin'].includes(adminProfile?.role);

  useEffect(() => {
    async function load() {
      // Find the user whose UID maps to this token
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const match = allUsersSnap.docs.find(d => uidToToken(d.id) === token);

      if (!match) { setNotFound(true); setLoading(false); return; }

      const userData = { uid: match.id, ...match.data() };
      setStudent(userData);
      setNewClass(userData.class || 'monwed');

      // Fetch any pending class change request from this student
      const classReqSnap = await getDocs(
        query(
          collection(db, 'classChangeRequests'),
          where('uid', '==', userData.uid),
          where('status', '==', 'pending'),
          limit(1)
        )
      );
      const classReqDoc = classReqSnap.docs[0];
      setPendingClassReq(classReqDoc ? { id: classReqDoc.id, ...classReqDoc.data() } : null);

      // Fetch all messages by this user, across every room, in one query —
      // a flat `messages` collection with a `room` field.
      const msgSnap = await getDocs(
        query(collection(db, 'messages'), where('senderId', '==', userData.uid), orderBy('createdAt', 'desc'))
      );

      const allMsgs = msgSnap.docs.map(d => {
        const row = d.data();
        return { id: d.id, ...row, roomLabel: ROOM_LABELS[row.room] || row.room };
      });
      setMessages(allMsgs);

      // Build last 7 days chart data
      const last7 = getLastNDays(7);
      const dayBuckets = new Map(last7.map(d => [d.toDateString(), 0]));
      allMsgs.forEach(msg => {
        const ts = toDate(msg.createdAt);
        if (!ts) return;
        const key = new Date(ts.toDateString()).toDateString();
        if (dayBuckets.has(key)) dayBuckets.set(key, dayBuckets.get(key) + 1);
      });
      setChartData(last7.map(d => ({
        day: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        messages: dayBuckets.get(d.toDateString()) || 0,
      })));

      setLoading(false);
    }
    load();
  }, [token]);

  async function handleSaveClass() {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', student.uid), { class: newClass });
      setStudent(prev => ({ ...prev, class: newClass }));
      setShowEditClass(false);
    } catch {
      alert('Failed to update class. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleAdmin() {
    const newRole = student.role === 'admin' ? 'student' : 'admin';
    if (!confirm(`${newRole === 'admin' ? 'Make' : 'Remove'} ${student.name} as admin?`)) return;
    setAdminToggleBusy(true);
    try {
      await updateDoc(doc(db, 'users', student.uid), { role: newRole });
      setStudent(prev => ({ ...prev, role: newRole }));
    } catch {
      alert('Failed to update role. Please try again.');
    } finally {
      setAdminToggleBusy(false);
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${student.name} from the app? This cannot be undone.`)) return;
    setRemoveBusy(true);
    setRemoveError('');
    try {
      // This only removes their Firestore profile — it does not delete the
      // underlying Firebase Auth account (no server-side admin access from
      // the client), so they'd be left able to authenticate but with no
      // profile. Same limitation existed under the prior backend.
      await deleteDoc(doc(db, 'users', student.uid));
      navigate('/admin/users');
    } catch {
      setRemoveError('Failed to remove student. Please try again.');
    } finally {
      setRemoveBusy(false);
    }
  }

  async function handleApproveClassChange() {
    if (!pendingClassReq) return;
    setClassReqBusy(true);
    try {
      await updateDoc(doc(db, 'users', student.uid), { class: pendingClassReq.requestedClass });
      await updateDoc(doc(db, 'classChangeRequests', pendingClassReq.id), { status: 'approved' });

      await triggerNotification('class-change-resolved', {
        userId: student.uid,
        approved: true,
        requestedClassLabel: classLabel(pendingClassReq.requestedClass),
      });

      setStudent(prev => ({ ...prev, class: pendingClassReq.requestedClass }));
      setNewClass(pendingClassReq.requestedClass);
      setPendingClassReq(null);
    } catch (err) {
      console.error(err);
      alert('Failed to approve class change. Please try again.');
    } finally {
      setClassReqBusy(false);
    }
  }

  async function handleDenyClassChange() {
    if (!pendingClassReq) return;
    if (!confirm(`Deny ${student.name}'s request to move to ${classLabel(pendingClassReq.requestedClass)}?`)) return;
    setClassReqBusy(true);
    try {
      await triggerNotification('class-change-resolved', {
        userId: student.uid,
        approved: false,
        requestedClassLabel: classLabel(pendingClassReq.requestedClass),
      });
      await deleteDoc(doc(db, 'classChangeRequests', pendingClassReq.id));
      setPendingClassReq(null);
    } catch (err) {
      console.error(err);
      alert('Failed to deny request. Please try again.');
    } finally {
      setClassReqBusy(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout userProfile={adminProfile} isAdmin={isViewerAdmin}>
        <Page><CenteredNote>Loading student profile…</CenteredNote></Page>
      </AdminLayout>
    );
  }

  if (notFound) {
    return (
      <AdminLayout userProfile={adminProfile} isAdmin={isViewerAdmin}>
        <Page><CenteredNote>Student not found.</CenteredNote></Page>
      </AdminLayout>
    );
  }

  const isAdmin = ['admin', 'superadmin'].includes(student.role);
  const isSuperAdmin = student.role === 'superadmin';
  const firstInitial = student.name?.[0]?.toUpperCase() || '?';

  return (
    <AdminLayout userProfile={adminProfile} isAdmin={isViewerAdmin}>
      <Page>
        <BackBtn onClick={() => navigate('/admin/users')}>← Back to Roster</BackBtn>

        <SectionLabel>Student Profile</SectionLabel>

        {/* ── Header ── */}
        <Header>
          <HeaderBanner />
          <HeaderBody>
            <PhotoCircle>
              {!photoError ? (
                <img
                  src={student.photoURL || '/icons/ProfilePlaceholder.png'}
                  alt={student.name}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <PhotoFallback>{firstInitial}</PhotoFallback>
              )}
            </PhotoCircle>
            <HeaderInfo>
              <Name>{student.name}</Name>
              <Email>{student.email}</Email>
              <TagRow>
                <Tag $bg={isAdmin ? '#fef3c7' : '#f0fdf4'} $color={isAdmin ? '#92400e' : '#166534'} $border={isAdmin ? '#fde68a' : '#86efac'}>
                  {isAdmin ? '⚙️ Admin' : '🎓 Student'}
                </Tag>
                <Tag $bg="#ede9fe" $color="#5b21b6" $border="#c4b5fd">
                  🌿 {classLabel(student.class)}
                </Tag>
                <Tag>📅 Joined {formatDate(student.createdAt)}</Tag>
              </TagRow>
              <ActionRow>
                <EditClassBtn onClick={() => setShowEditClass(true)}>Edit Class</EditClassBtn>
                {!isSuperAdmin && (
                  <AdminBtn onClick={handleToggleAdmin} disabled={adminToggleBusy}>
                    {adminToggleBusy ? 'Working…' : isAdmin ? 'Remove Admin' : 'Make Admin'}
                  </AdminBtn>
                )}
                {!isSuperAdmin && (
                  <RemoveBtn onClick={handleRemove} disabled={removeBusy}>
                    {removeBusy ? 'Removing…' : 'Remove'}
                  </RemoveBtn>
                )}
              </ActionRow>
              {removeError && <Email style={{ color: '#dc2626', marginTop: '0.5rem' }}>{removeError}</Email>}
            </HeaderInfo>
          </HeaderBody>
        </Header>

        {/* ── Pending Class Change Request ── */}
        {pendingClassReq && (
          <ClassReqCard>
            <ClassReqInfo>
              <ClassReqTitle>🔄 Class Change Requested</ClassReqTitle>
              <ClassReqBody>
                {student.name?.split(' ')[0]} wants to move from{' '}
                <strong>{classLabel(pendingClassReq.currentClass)}</strong> to{' '}
                <strong>{classLabel(pendingClassReq.requestedClass)}</strong>.
              </ClassReqBody>
            </ClassReqInfo>
            <ClassReqActions>
              <SaveBtn onClick={handleApproveClassChange} disabled={classReqBusy} style={{ width: 'auto' }}>
                {classReqBusy ? 'Working…' : 'Approve'}
              </SaveBtn>
              <CancelBtn onClick={handleDenyClassChange} disabled={classReqBusy} style={{ width: 'auto', color: '#dc2626', borderColor: '#fecaca' }}>
                Deny
              </CancelBtn>
            </ClassReqActions>
          </ClassReqCard>
        )}

        {/* ── Stats ── */}
        <SectionLabel>Activity Overview</SectionLabel>
        <StatsGrid>
          <StatCard>
            <StatIcon>💬</StatIcon>
            <StatNum>{messages.length}</StatNum>
            <StatLabel>Total Messages</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>💬</StatIcon>
            <StatNum>{messages.filter(m => m.room === 'class-chat').length}</StatNum>
            <StatLabel>Class Chat</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>🌿</StatIcon>
            <StatNum>{messages.filter(m => m.room === 'mon-wed').length}</StatNum>
            <StatLabel>Mon/Wed</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>🌸</StatIcon>
            <StatNum>{messages.filter(m => m.room === 'tue-thu').length}</StatNum>
            <StatLabel>Tue/Thu</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>⏳</StatIcon>
            <StatNum>{memberSince(student.createdAt)}</StatNum>
            <StatLabel>Member For</StatLabel>
          </StatCard>
        </StatsGrid>

        {/* ── Activity Chart ── */}
        <Section>
          <SectionTitle>📈 Message Activity — Last 7 Days</SectionTitle>
          {messages.length === 0 ? (
            <Empty>No messages sent yet.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="messages" fill="#d97706" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* ── Message History ── */}
        <Section>
          <SectionTitle>💬 All Messages ({messages.length})</SectionTitle>
          {messages.length === 0 ? (
            <Empty>No messages sent yet.</Empty>
          ) : (
            <MsgList>
              {messages.map(msg => (
                <MsgItem key={`${msg.room}-${msg.id}`}>
                  <MsgTop>
                    <MsgRoom>{msg.roomLabel}</MsgRoom>
                    <MsgTime>{formatMsgTime(msg.createdAt)}</MsgTime>
                  </MsgTop>
                  <MsgText>{msg.text}</MsgText>
                </MsgItem>
              ))}
            </MsgList>
          )}
        </Section>

        {/* ── Edit Class Modal ── */}
        {showEditClass && (
          <Modal onClick={e => e.target === e.currentTarget && setShowEditClass(false)}>
            <ModalCard>
              <h2>Change {student.name?.split(' ')[0]}'s Class</h2>
              <Select value={newClass} onChange={e => setNewClass(e.target.value)}>
                <option value="monwed">Mon / Wed</option>
                <option value="tuethu">Tue / Thu</option>
                <option value="both">Both Classes</option>
              </Select>
              <ModalBtns>
                <CancelBtn onClick={() => setShowEditClass(false)}>Cancel</CancelBtn>
                <SaveBtn onClick={handleSaveClass} disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </SaveBtn>
              </ModalBtns>
            </ModalCard>
          </Modal>
        )}
      </Page>
    </AdminLayout>
  );
}