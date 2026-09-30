import { useState, useEffect } from 'react';
import {
  collection, doc, getDocs, query, where, setDoc, updateDoc, deleteDoc, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import emailjs from '@emailjs/browser';
import styled from 'styled-components';

const Page = styled.div``;
const Title = styled.h1`font-family: Georgia, serif; font-size: 1.6rem; color: var(--brown-dark); margin: 0 0 0.5rem;`;
const Sub = styled.p`color: var(--text-muted); font-size: 0.875rem; margin: 0 0 1.5rem;`;
const Empty = styled.div`text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.95rem;`;

const Card = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 14px;
  padding: 1.1rem 1.25rem; margin-bottom: 0.75rem; box-shadow: 0 1px 6px var(--shadow);
`;
const CardTop = styled.div`display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;`;
const UserInfo = styled.div`
  h3 { font-size: 1rem; color: var(--text-primary); margin: 0 0 0.15rem; }
  p  { font-size: 0.825rem; color: var(--text-muted); margin: 0; }
`;
const Actions = styled.div`display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;`;

const Btn = styled.button`
  padding: 0.45rem 1rem; border-radius: 8px; font-size: 0.825rem; font-weight: 600;
  cursor: pointer; border: none; transition: opacity 0.2s;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const ApproveBtn = styled(Btn)`background: linear-gradient(135deg, #78350f, #d97706); color: white;`;
const DenyBtn    = styled(Btn)`background: #fee2e2; color: #dc2626;`;
const Note = styled.p`font-size: 0.72rem; color: var(--text-muted); margin: 0.4rem 0 0; font-style: italic;`;

const Modal = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem;
`;
const ModalCard = styled.div`
  background: var(--bg-card); border-radius: 16px; padding: 1.75rem; width: 100%; max-width: 360px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  h2 { font-family: Georgia, serif; color: var(--brown-dark); margin: 0 0 0.5rem; }
  p  { font-size: 0.875rem; color: var(--text-secondary); margin: 0 0 1.25rem; }
`;
const Select = styled.select`
  width: 100%; padding: 0.7rem 0.9rem; border: 1.5px solid var(--border); border-radius: 10px;
  font-size: 0.95rem; background: var(--bg-secondary); color: var(--text-primary); margin-bottom: 1rem;
  &:focus { outline: none; border-color: var(--amber); }
`;
const ModalBtns = styled.div`display: flex; gap: 0.75rem;`;
const ConfirmBtn = styled(Btn)`flex: 1; background: linear-gradient(135deg, #78350f, #d97706); color: white; padding: 0.7rem;`;
const CancelBtn  = styled(Btn)`flex: 1; background: var(--bg-secondary); color: var(--text-secondary); border: 1.5px solid var(--border); padding: 0.7rem;`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSecureToken() {
  // 32-character cryptographically random token using browser crypto API.
  // This becomes the invites/{token} document ID — see firestore.rules.
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 32);
}

const EMAILJS_SERVICE_ID = 'service_kmyet4g';
const EMAILJS_INVITE_TEMPLATE_ID = 'template_gopxech';
const EMAILJS_PUBLIC_KEY = 'K7Ti5RWt7zcniRrII';

async function sendInviteEmail(name, email, token) {
  const link = `${window.location.origin}/set-password/${token}`;
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_INVITE_TEMPLATE_ID,
    {
      to_name: name,
      to_email: email,
      link: link,
    },
    EMAILJS_PUBLIC_KEY
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAccessApproval() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null); // request object being approved
  const [selectedClass, setSelectedClass] = useState('monwed');
  const [busy, setBusy] = useState(false);

  async function load() {
    const snap = await getDocs(query(collection(db, 'accessRequests'), where('status', '==', 'pending')));
    setPending(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  // load() is async and reused by handleApprove/handleDeny to refresh the
  // list; its setState calls happen after the await, not synchronously here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function handleApprove() {
    setBusy(true);
    try {
      // Reuse an existing, still-valid pending invite for this email instead of
      // creating a duplicate — matters if a previous approval attempt created
      // the invite but failed before the request could be marked approved.
      const existingSnap = await getDocs(
        query(
          collection(db, 'invites'),
          where('email', '==', approving.email),
          where('status', '==', 'pending'),
          where('expiresAt', '>', Timestamp.now()),
          limit(1)
        )
      );
      const existingInvite = existingSnap.docs[0]?.data();

      const token = existingInvite?.token || generateSecureToken();

      if (!existingInvite) {
        const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await setDoc(doc(db, 'invites', token), {
          email: approving.email,
          name: approving.name,
          class: selectedClass,
          token,
          status: 'pending',
          expiresAt,
          createdAt: Timestamp.now(),
        });
      }

      // Send email
      await sendInviteEmail(approving.name, approving.email, token);

      // Mark access request as approved
      await updateDoc(doc(db, 'accessRequests', approving.id), { status: 'approved' });

      setApproving(null);
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to approve — the invite may still have been created. Try Approve again; it will reuse the same invite rather than sending a duplicate.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeny(req) {
    if (!confirm('Are you sure you want to deny and remove this request?')) return;
    try {
      await deleteDoc(doc(db, 'accessRequests', req.id));
      setPending(p => p.filter(r => r.id !== req.id));
    } catch {
      alert('Failed to deny. Please try again.');
    }
  }

  return (
    <Page>
      <Title>Access Approval</Title>
      <Sub>{pending.length} request{pending.length !== 1 ? 's' : ''} waiting</Sub>

      {loading ? (
        <Empty>Loading…</Empty>
      ) : pending.length === 0 ? (
        <Empty>🎉 No pending requests!</Empty>
      ) : (
        pending.map(req => (
          <Card key={req.id}>
            <CardTop>
              <UserInfo>
                <h3>{req.name}</h3>
                <p>{req.email}</p>
              </UserInfo>
            </CardTop>
            <Actions>
              <ApproveBtn onClick={() => { setApproving(req); setSelectedClass('monwed'); }}>
                Approve
              </ApproveBtn>
              <DenyBtn onClick={() => handleDeny(req)}>Deny</DenyBtn>
            </Actions>
            <Note>You will be asked to assign a class after pressing Approve</Note>
          </Card>
        ))
      )}

      {approving && (
        <Modal onClick={e => e.target === e.currentTarget && !busy && setApproving(null)}>
          <ModalCard>
            <h2>Assign a Class</h2>
            <p>Which class should {approving.name.split(' ')[0]} join? They'll receive an email to set their password.</p>
            <Select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="monwed">Mon / Wed</option>
              <option value="tuethu">Tue / Thu</option>
              <option value="both">Both Classes</option>
            </Select>
            <ModalBtns>
              <CancelBtn onClick={() => setApproving(null)} disabled={busy}>Cancel</CancelBtn>
              <ConfirmBtn onClick={handleApprove} disabled={busy}>
                {busy ? 'Sending invite…' : 'Approve & Send Invite'}
              </ConfirmBtn>
            </ModalBtns>
          </ModalCard>
        </Modal>
      )}
    </Page>
  );
}
