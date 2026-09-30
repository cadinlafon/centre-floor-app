import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider, reauthenticateWithCredential, updateEmail, signOut,
} from 'firebase/auth';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, limit,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { uploadProfilePhoto } from '../lib/storage';
import emailjs from '@emailjs/browser';
import styled from 'styled-components';
import { registerPushNotifications } from '../utils/pushNotifications';
import { triggerNotification } from '../utils/notifyServer';

const Page = styled.div`padding: 1.25rem; max-width: 480px; margin: 0 auto;`;

const AvatarRow = styled.div`
  display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;
  padding: 1.25rem; background: var(--bg-card); border: 1.5px solid var(--border);
  border-radius: 16px; box-shadow: 0 2px 8px var(--shadow);
`;

const AvatarWrap = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  cursor: pointer;

  &:hover .avatar-overlay { opacity: 1; }
`;

const BigAvatar = styled.div`
  width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #78350f, #d97706);
  color: white; font-size: 1.6rem; font-weight: 700; font-family: Georgia, serif;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const AvatarOverlay = styled.div`
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 1.1rem;
  opacity: ${p => p.$busy ? 1 : 0};
  transition: opacity 0.15s;
  pointer-events: none;
`;

const HiddenFileInput = styled.input`display: none;`;

const AvatarInfo = styled.div`
  h2 { font-family: Georgia, serif; font-size: 1.2rem; color: var(--brown-dark); margin: 0 0 0.15rem; }
  p  { font-size: 0.825rem; color: var(--text-muted); margin: 0; }
`;
const ClassBadge = styled.span`
  margin-top: 0.35rem; display: inline-block;
  padding: 0.15rem 0.55rem; border-radius: 20px;
  background: #f0fdf4; color: #166534;
  font-size: 0.72rem; font-weight: 600;
`;

const Section = styled.section`margin-bottom: 1.25rem;`;
const SectionLabel = styled.p`
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-muted); margin: 0 0 0.5rem;
`;
const Card = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border);
  border-radius: 14px; overflow: hidden; box-shadow: 0 1px 6px var(--shadow);
`;
const Row = styled.div`
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid var(--border);
  &:last-child { border-bottom: none; }
`;
const RowLabel = styled.p`font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.04em;`;
const RowValue = styled.p`font-size: 0.95rem; color: var(--text-primary); margin: 0;`;
const EditBtn = styled.button`
  margin-top: 0.5rem; padding: 0.35rem 0.75rem;
  background: var(--bg-secondary); border: 1.5px solid var(--border);
  border-radius: 8px; font-size: 0.78rem; font-weight: 600;
  color: var(--text-secondary); cursor: pointer; transition: border-color 0.2s;
  &:hover { border-color: var(--amber); color: var(--amber); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const InlineForm = styled.div`
  margin-top: 0.5rem; display: flex; gap: 0.4rem; flex-wrap: wrap;
  input {
    flex: 1; min-width: 0; padding: 0.5rem 0.75rem; border: 1.5px solid var(--border);
    border-radius: 8px; font-size: 0.875rem; background: var(--bg-secondary); color: var(--text-primary);
    &:focus { outline: none; border-color: var(--amber); }
  }
`;
const CodeInput = styled.input`
  width: 100%; padding: 0.8rem; border: 1.5px solid var(--border); border-radius: 10px;
  font-size: 1.4rem; font-weight: 700; letter-spacing: 0.35em; text-align: center;
  color: var(--brown-dark); background: var(--bg-secondary); box-sizing: border-box;
  font-family: 'Courier New', monospace;
  &:focus { outline: none; border-color: var(--amber); }
`;
const SaveBtn = styled.button`
  padding: 0.5rem 0.9rem; background: linear-gradient(135deg, #78350f, #d97706);
  color: white; border: none; border-radius: 8px; font-size: 0.825rem;
  font-weight: 600; cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const CancelBtn = styled.button`
  padding: 0.5rem 0.75rem; background: var(--bg-secondary);
  border: 1.5px solid var(--border); color: var(--text-muted);
  border-radius: 8px; font-size: 0.825rem; cursor: pointer;
`;
const ResendBtn = styled.button`
  background: none; border: none; color: var(--amber); font-size: 0.8rem; cursor: pointer;
  padding: 0; text-decoration: underline;
  &:disabled { color: var(--text-muted); cursor: default; text-decoration: none; }
`;
const Msg = styled.p`
  font-size: 0.78rem; margin: 0.35rem 0 0;
  color: ${p => p.$error ? '#dc2626' : '#166534'};
`;
const HelpText = styled.p`font-size: 0.75rem; color: var(--text-muted); margin: 0.4rem 0 0; line-height: 1.4;`;

const PendingNote = styled.div`
  margin-top: 0.6rem; padding: 0.65rem 0.85rem; background: #fef3c7; border-radius: 10px;
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;
`;
const PendingText = styled.p`font-size: 0.8rem; color: #92400e; margin: 0; font-weight: 600;`;
const PendingCancelBtn = styled.button`
  background: none; border: none; color: #92400e; font-size: 0.72rem; cursor: pointer;
  text-decoration: underline; padding: 0; font-weight: 600;
`;

const DangerCard = styled(Card)`border-color: #fecaca;`;
const DangerBtn = styled.button`
  width: 100%; padding: 0.9rem 1.1rem; background: none; border: none;
  text-align: left; font-size: 0.95rem; color: #dc2626; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
  &:hover { background: #fff1f2; }
`;

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
const ModalConfirmBtn = styled(SaveBtn)`flex: 1; padding: 0.7rem;`;
const ModalCancelBtn = styled(CancelBtn)`flex: 1; padding: 0.7rem;`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const classLabel = c => c === 'monwed' ? 'Mon / Wed' : c === 'tuethu' ? 'Tue / Thu' : c === 'both' ? 'Both Classes' : '—';

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Reuses the same EmailJS service/template as the Request Access verification email
const EMAILJS_SERVICE_ID = 'service_kmyet4g';
const EMAILJS_TEMPLATE_ID = 'template_o0v471g';
const EMAILJS_PUBLIC_KEY = 'K7Ti5RWt7zcniRrII';

async function sendVerificationEmail(name, email, code) {
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    { to_name: name, to_email: email, code },
    EMAILJS_PUBLIC_KEY
  );
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

// ─── Component ────────────────────────────────────────────────────────────────

export default function Account({ userProfile }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMsg, setPhotoMsg] = useState('');

  // Name
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameMsg, setNameMsg] = useState('');

  // Email (2-step verified change)
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailStep, setEmailStep] = useState(1); // 1 = enter new email, 2 = enter code + password
  const [newEmail, setNewEmail] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState(null);
  const [reAuthPass, setReAuthPass] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Class change request
  const [pendingClassRequest, setPendingClassRequest] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [requestedClass, setRequestedClass] = useState('monwed');
  const [classBusy, setClassBusy] = useState(false);
  const [classMsg, setClassMsg] = useState('');

  const [busy, setBusy] = useState(false);
  const [notifState, setNotifState] = useState('idle');
  const [notifMsg, setNotifMsg] = useState('');

  useEffect(() => {
    async function loadPendingRequest() {
      if (!userProfile?.uid) return;
      try {
        const snap = await getDocs(
          query(
            collection(db, 'classChangeRequests'),
            where('uid', '==', userProfile.uid),
            where('status', '==', 'pending'),
            limit(1)
          )
        );
        const d = snap.docs[0];
        setPendingClassRequest(d ? { id: d.id, ...d.data() } : null);
      } catch (err) {
        console.error('Failed to load class change request:', err);
      }
    }
    loadPendingRequest();
  }, [userProfile?.uid]);

  const cooldownIntervalRef = useRef(null);
  useEffect(() => () => clearInterval(cooldownIntervalRef.current), []);

  function startCooldown() {
    setResendCooldown(60);
    clearInterval(cooldownIntervalRef.current);
    cooldownIntervalRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownIntervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  // ── Photo ──────────────────────────────────────────────────────────────

  function handleAvatarClick() {
    if (!uploadingPhoto) fileInputRef.current?.click();
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoMsg('Please choose an image file.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoMsg('Image must be under 5MB.');
      return;
    }

    setUploadingPhoto(true);
    setPhotoMsg('');
    try {
      const targetUid = userProfile?.uid;
      if (!targetUid) {
        throw new Error('Missing authenticated user uid for photo upload.');
      }

      const url = await uploadProfilePhoto(targetUid, file);
      await updateDoc(doc(db, 'users', targetUid), { photoURL: url });
    } catch (err) {
      console.error('[photo upload] failed', err);
      setPhotoMsg('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ── Name ───────────────────────────────────────────────────────────────

  async function saveName() {
    if (!newName.trim()) return;
    setBusy(true); setNameMsg('');
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), { name: newName.trim() });
      setNameMsg('Name updated!');
      setEditingName(false);
    } catch { setNameMsg('Failed to update.'); }
    finally { setBusy(false); }
  }

  // ── Email (verified) ──────────────────────────────────────────────────

  function openEmailEditor() {
    setEditingEmail(true);
    setEmailStep(1);
    setNewEmail('');
    setInputCode('');
    setReAuthPass('');
    setEmailMsg('');
  }

  function closeEmailEditor() {
    setEditingEmail(false);
    setEmailStep(1);
  }

  async function handleSendEmailCode() {
    setEmailMsg('');
    const trimmed = newEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailMsg('Please enter a valid email address.');
      return;
    }
    if (trimmed.toLowerCase() === userProfile?.email?.toLowerCase()) {
      setEmailMsg('That is already your current email.');
      return;
    }

    setBusy(true);
    try {
      // Make sure no other account already uses this email
      const existingSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', trimmed.toLowerCase()), limit(1))
      );
      if (!existingSnap.empty) {
        setEmailMsg('An account with this email already exists.');
        setBusy(false);
        return;
      }

      const code = generateSixDigitCode();
      await sendVerificationEmail(userProfile?.name || 'there', trimmed, code);
      setGeneratedCode(code);
      setCodeExpiry(Date.now() + 15 * 60 * 1000);
      setEmailStep(2);
      startCooldown();
    } catch (err) {
      console.error(err);
      setEmailMsg('Failed to send verification email. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResendEmailCode() {
    setBusy(true); setEmailMsg('');
    try {
      const code = generateSixDigitCode();
      await sendVerificationEmail(userProfile?.name || 'there', newEmail.trim(), code);
      setGeneratedCode(code);
      setCodeExpiry(Date.now() + 15 * 60 * 1000);
      setInputCode('');
      startCooldown();
    } catch {
      setEmailMsg('Failed to resend. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyAndSaveEmail() {
    setEmailMsg('');
    if (Date.now() > codeExpiry) {
      setEmailMsg('This code has expired. Please resend a new one.');
      return;
    }
    if (inputCode.trim() !== generatedCode) {
      setEmailMsg('Incorrect code. Please check your email and try again.');
      return;
    }
    if (!reAuthPass) {
      setEmailMsg('Enter your current password to confirm.');
      return;
    }

    setBusy(true);
    try {
      const credential = EmailAuthProvider.credential(userProfile.email, reAuthPass);
      try {
        await reauthenticateWithCredential(auth.currentUser, credential);
      } catch {
        setEmailMsg('Incorrect password.');
        setBusy(false);
        return;
      }

      await updateEmail(auth.currentUser, newEmail.trim());
      await updateDoc(doc(db, 'users', userProfile.uid), { email: newEmail.trim().toLowerCase() });

      closeEmailEditor();
    } catch {
      setEmailMsg('Failed to update email.');
    } finally {
      setBusy(false);
    }
  }

  // ── Class change request ──────────────────────────────────────────────

  function openClassModal() {
    setRequestedClass(userProfile?.class || 'monwed');
    setClassMsg('');
    setShowClassModal(true);
  }

  async function handleSubmitClassChange() {
    if (requestedClass === userProfile?.class) {
      setClassMsg("That's already your current class.");
      return;
    }
    setClassBusy(true); setClassMsg('');
    try {
      const newReqData = {
        uid: userProfile.uid,
        name: userProfile.name,
        email: userProfile.email,
        currentClass: userProfile.class || null,
        requestedClass: requestedClass,
        status: 'pending',
        requestedAt: serverTimestamp(),
      };
      const created = await addDoc(collection(db, 'classChangeRequests'), newReqData);
      setPendingClassRequest({ id: created.id, ...newReqData });
      setShowClassModal(false);

      await triggerNotification('account-request-submitted', {
        requestType: 'class-change',
        name: userProfile.name,
      });
    } catch (err) {
      console.error(err);
      setClassMsg('Failed to submit request. Please try again.');
    } finally {
      setClassBusy(false);
    }
  }

  async function handleCancelClassRequest() {
    if (!pendingClassRequest) return;
    try {
      await deleteDoc(doc(db, 'classChangeRequests', pendingClassRequest.id));
      setPendingClassRequest(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleEnableNotifications() {
    setNotifState('busy');
    setNotifMsg('');
    try {
      const playerId = await registerPushNotifications(userProfile, { requestPermission: true });
      if (playerId) {
        setNotifState('enabled');
      } else {
        setNotifState('error');
        setNotifMsg("Couldn't enable notifications on this device. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setNotifState('error');
      setNotifMsg(err.message || 'Failed to enable notifications.');
    }
  }

  // ── Sign out / unregister ─────────────────────────────────────────────

  async function handleUnregister() {
    if (!confirm('Request to unregister from the app? The admin will remove your account.')) return;
    try {
      await addDoc(collection(db, 'accountRemovalRequests'), {
        uid: userProfile.uid,
        name: userProfile.name,
        email: userProfile.email,
        status: 'pending',
        requestedAt: serverTimestamp(),
      });
      // Must fire before signOut below — the notify function requires a
      // signed-in caller for this notification kind.
      await triggerNotification('account-request-submitted', {
        requestType: 'account-removal',
        name: userProfile.name,
      });
    } catch (err) {
      console.error('Failed to record unregister request:', err);
    }
    await signOut(auth);
    navigate('/login');
  }

  async function handleSignOut() {
    await signOut(auth);
    navigate('/login');
  }

  const firstInitial = userProfile?.name?.[0]?.toUpperCase() || '?';

  return (
    <Page>
      {/* Avatar */}
      <AvatarRow>
        <AvatarWrap onClick={handleAvatarClick} title="Change profile photo">
          <BigAvatar>
            {userProfile?.photoURL ? <img src={userProfile.photoURL} alt={userProfile?.name} /> : firstInitial}
          </BigAvatar>
          <AvatarOverlay className="avatar-overlay" $busy={uploadingPhoto}>
            {uploadingPhoto ? '…' : '📷'}
          </AvatarOverlay>
        </AvatarWrap>
        <HiddenFileInput
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelected}
        />
        <AvatarInfo>
          <h2>{userProfile?.name || 'Student'}</h2>
          <p>{userProfile?.email}</p>
          <ClassBadge>{classLabel(userProfile?.class)}</ClassBadge>
        </AvatarInfo>
      </AvatarRow>
      {photoMsg && <Msg $error style={{ marginTop: '-1.25rem', marginBottom: '1.25rem' }}>{photoMsg}</Msg>}

      {/* Account info */}
      <Section>
        <SectionLabel>Account</SectionLabel>
        <Card>
          {/* Name */}
          <Row>
            <RowLabel>Name</RowLabel>
            <RowValue>{userProfile?.name}</RowValue>
            {!editingName
              ? <EditBtn onClick={() => { setEditingName(true); setNewName(userProfile?.name || ''); setNameMsg(''); }}>Edit Name</EditBtn>
              : <>
                  <InlineForm>
                    <input value={newName} onChange={e => setNewName(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }} />
                    <SaveBtn onClick={saveName} disabled={busy}>Save</SaveBtn>
                    <CancelBtn onClick={() => setEditingName(false)}>Cancel</CancelBtn>
                  </InlineForm>
                  {nameMsg && <Msg $error={nameMsg.includes('Failed')}>{nameMsg}</Msg>}
                </>
            }
          </Row>

          {/* Email */}
          <Row>
            <RowLabel>Email</RowLabel>
            <RowValue>{userProfile?.email}</RowValue>
            {!editingEmail
              ? <EditBtn onClick={openEmailEditor}>Edit Email</EditBtn>
              : (
                <>
                  {emailStep === 1 && (
                    <>
                      <InlineForm>
                        <input
                          placeholder="New email address"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          type="email"
                          autoFocus
                        />
                      </InlineForm>
                      <HelpText>We'll send a 6-digit code to this address to verify you own it.</HelpText>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                        <SaveBtn onClick={handleSendEmailCode} disabled={busy}>
                          {busy ? 'Sending…' : 'Send Verification Code'}
                        </SaveBtn>
                        <CancelBtn onClick={closeEmailEditor}>Cancel</CancelBtn>
                      </div>
                    </>
                  )}

                  {emailStep === 2 && (
                    <>
                      <HelpText>Enter the code sent to <strong>{newEmail}</strong>, and your current password to confirm.</HelpText>
                      <div style={{ margin: '0.6rem 0' }}>
                        <CodeInput
                          type="text"
                          inputMode="numeric"
                          placeholder="000000"
                          value={inputCode}
                          onChange={e => setInputCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          maxLength={6}
                          autoComplete="one-time-code"
                        />
                      </div>
                      <InlineForm>
                        <input
                          placeholder="Current password"
                          value={reAuthPass}
                          onChange={e => setReAuthPass(e.target.value)}
                          type="password"
                          autoComplete="current-password"
                        />
                      </InlineForm>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                        <SaveBtn onClick={handleVerifyAndSaveEmail} disabled={busy}>
                          {busy ? 'Verifying…' : 'Verify & Update Email'}
                        </SaveBtn>
                        <CancelBtn onClick={closeEmailEditor}>Cancel</CancelBtn>
                      </div>
                      <HelpText>
                        Didn't get it?{' '}
                        <ResendBtn onClick={handleResendEmailCode} disabled={resendCooldown > 0 || busy}>
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                        </ResendBtn>
                      </HelpText>
                    </>
                  )}

                  {emailMsg && <Msg $error={!emailMsg.includes('updated')}>{emailMsg}</Msg>}
                </>
              )
            }
          </Row>

          {/* Class */}
          <Row>
            <RowLabel>Your Class</RowLabel>
            <RowValue>{classLabel(userProfile?.class)}</RowValue>

            {pendingClassRequest ? (
              <PendingNote>
                <PendingText>
                  ⏳ Change to {classLabel(pendingClassRequest.requestedClass)} requested — awaiting approval
                </PendingText>
                <PendingCancelBtn onClick={handleCancelClassRequest}>Cancel request</PendingCancelBtn>
              </PendingNote>
            ) : (
              <EditBtn onClick={openClassModal}>Request Class Change</EditBtn>
            )}
          </Row>
        </Card>
      </Section>

      {/* Notifications */}
      <Section>
        <SectionLabel>Notifications</SectionLabel>
        <Card>
          <Row>
            <div>
              <RowLabel>Push Notifications</RowLabel>
              <RowValue>{userProfile?.notificationsEnabled ? 'Enabled' : 'Not enabled yet'}</RowValue>
              <HelpText>Allow browser notifications so the app can alert you about new messages, announcements, requests, and account updates.</HelpText>
              {notifMsg && <Msg $error={notifState === 'error'}>{notifMsg}</Msg>}
            </div>
            <SaveBtn onClick={handleEnableNotifications} disabled={notifState === 'busy'}>
              {notifState === 'busy' ? 'Enabling…' : 'Enable notifications'}
            </SaveBtn>
          </Row>
        </Card>
      </Section>

      {/* Sign out */}
      <Section>
        <SectionLabel>Session</SectionLabel>
        <Card>
          <DangerBtn onClick={handleSignOut} style={{ color: 'var(--brown-dark)' }}>
            <span>🚪</span> Sign Out
          </DangerBtn>
        </Card>
      </Section>

      {/* Danger zone */}
      <Section>
        <SectionLabel>Danger Zone</SectionLabel>
        <DangerCard>
          <DangerBtn onClick={handleUnregister}>
            <span>⚠️</span> Unregister from App
          </DangerBtn>
        </DangerCard>
      </Section>

      {/* Class change modal */}
      {showClassModal && (
        <Modal onClick={e => e.target === e.currentTarget && !classBusy && setShowClassModal(false)}>
          <ModalCard>
            <h2>Request a Class Change</h2>
            <p>Choose the class you'd like to move to. Your instructor will review and approve the change.</p>
            <Select value={requestedClass} onChange={e => setRequestedClass(e.target.value)}>
              <option value="monwed">Mon / Wed</option>
              <option value="tuethu">Tue / Thu</option>
              <option value="both">Both Classes</option>
            </Select>
            {classMsg && <Msg $error>{classMsg}</Msg>}
            <ModalBtns style={{ marginTop: '0.75rem' }}>
              <ModalCancelBtn onClick={() => setShowClassModal(false)} disabled={classBusy}>Cancel</ModalCancelBtn>
              <ModalConfirmBtn onClick={handleSubmitClassChange} disabled={classBusy}>
                {classBusy ? 'Sending…' : 'Send Request'}
              </ModalConfirmBtn>
            </ModalBtns>
          </ModalCard>
        </Modal>
      )}
    </Page>
  );
}