import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { uploadProfilePhoto } from '../lib/storage';
import { triggerNotification } from '../utils/notifyServer';
import styled from 'styled-components';

const Page = styled.div`
  min-height: 100vh; background: var(--bg-primary);
  display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem;
`;
const Card = styled.div`
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
  padding: 2.5rem 2rem; width: 100%; max-width: 420px; box-shadow: 0 4px 24px var(--shadow);
`;
const Logo = styled.div`
  text-align: center; margin-bottom: 1.5rem;
  h1 { font-family: Georgia, serif; font-size: 2rem; color: var(--brown-dark); margin: 0 0 0.25rem; }
  p { font-size: 0.9rem; color: var(--text-muted); margin: 0; }
`;
const EmailChip = styled.div`
  background: var(--bg-secondary); border: 1.5px solid var(--border); border-radius: 10px;
  padding: 0.75rem 1rem; text-align: center; margin-bottom: 1.5rem;
  font-size: 0.95rem; color: var(--brown-dark); font-weight: 600;
`;
const Field = styled.div`
  margin-bottom: 1.25rem;
  label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em; }
  input { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid var(--border); border-radius: 10px; font-size: 1rem; color: var(--text-primary); background: var(--bg-secondary); box-sizing: border-box; transition: border-color 0.2s;
    &:focus { outline: none; border-color: var(--amber); } }
`;
const SubmitBtn = styled.button`
  width: 100%; padding: 0.875rem; background: linear-gradient(135deg, #78350f 0%, #d97706 100%);
  color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer;
  margin-top: 0.5rem; transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const ErrorMsg = styled.p`color: #dc2626; font-size: 0.875rem; margin: 0.75rem 0 0; text-align: center;`;
const CenterMsg = styled.p`color: var(--text-secondary); font-size: 0.9rem; text-align: center; line-height: 1.6;`;
const BigIcon = styled.div`font-size: 3rem; text-align: center; margin-bottom: 1rem;`;
const BackLink = styled(Link)`display: block; text-align: center; margin-top: 1.25rem; color: var(--text-muted); font-size: 0.875rem; text-decoration: none; &:hover { color: var(--amber); }`;

const AvatarPickRow = styled.div`display: flex; flex-direction: column; align-items: center; margin-bottom: 1.5rem;`;
const AvatarWrap = styled.div`
  position: relative;
  width: 96px;
  height: 96px;
  cursor: pointer;
  margin-bottom: 0.75rem;

  &:hover .avatar-overlay { opacity: 1; }
`;
const BigAvatar = styled.div`
  width: 96px; height: 96px; border-radius: 50%;
  background: linear-gradient(135deg, #78350f, #d97706);
  color: white; font-size: 2.2rem; font-weight: 700; font-family: Georgia, serif;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;
const AvatarOverlay = styled.div`
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 1.4rem;
  opacity: ${p => p.$busy ? 1 : 0};
  transition: opacity 0.15s;
  pointer-events: none;
`;
const HiddenFileInput = styled.input`display: none;`;
const AvatarHint = styled.p`font-size: 0.8rem; color: var(--text-muted); margin: 0; text-align: center;`;
const SkipBtn = styled.button`
  width: 100%; padding: 0.8rem; background: var(--bg-secondary);
  border: 1.5px solid var(--border); color: var(--text-secondary);
  border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer;
  margin-top: 0.6rem; transition: border-color 0.2s;
  &:hover { border-color: var(--amber); color: var(--amber); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export default function SetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('checking'); // checking | valid | invalid | expired | used | photo
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [newUid, setNewUid] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function checkToken() {
      try {
        // invites/{token} — the doc ID IS the token, so an unauthenticated
        // visitor can `get` only this one document if they have the exact
        // link, without being able to list/enumerate the collection.
        const snap = await getDoc(doc(db, 'invites', token));
        if (!snap.exists()) {
          setStatus('invalid');
          return;
        }
        const data = snap.data();

        if (data.status === 'used') {
          setStatus('used');
          return;
        }
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt && expiresAt < new Date()) {
          setStatus('expired');
          return;
        }

        setInvite({
          id: token,
          email: data.email,
          name: data.name,
          class: data.class,
        });
        setStatus('valid');
      } catch (err) {
        console.error(err);
        setStatus('invalid');
      }
    }
    checkToken();
  }, [token]);

  async function handleSubmit() {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, invite.email, password);
      } catch (signUpError) {
        setError(
          signUpError.code === 'auth/email-already-in-use'
            ? 'An account with this email already exists. Try signing in.'
            : 'Something went wrong. Please try again.'
        );
        return;
      }

      const newUserId = cred.user.uid;

      await setDoc(doc(db, 'users', newUserId), {
        name: invite.name,
        email: invite.email,
        role: 'student',
        class: invite.class,
        status: 'approved',
        passwordSetAt: serverTimestamp(),
      });

      // invite.id is the token — invites/{token} — see checkToken above.
      await updateDoc(doc(db, 'invites', invite.id), { status: 'used' });

      await triggerNotification('password-set', {
        userId: newUserId,
        name: invite.name,
        email: invite.email,
      });

      setNewUid(newUserId);
      setStatus('photo');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function handlePickPhoto() {
    if (!uploadingPhoto) fileInputRef.current?.click();
  }

  function handlePhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError('');
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be under 5MB.');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSavePhotoAndContinue() {
    if (!photoFile || !newUid) {
      navigate('/home');
      return;
    }
    setUploadingPhoto(true);
    setPhotoError('');
    try {
      const targetUid = newUid;
      if (!targetUid) {
        throw new Error('Missing uid for photo upload during signup.');
      }

      const url = await uploadProfilePhoto(targetUid, photoFile);
      await updateDoc(doc(db, 'users', targetUid), { photoURL: url });
      navigate('/home');
    } catch (err) {
      console.error('[photo upload] failed', err);
      setPhotoError('Failed to upload photo. You can add one later from your Account page.');
      setUploadingPhoto(false);
    }
  }

  function handleSkipPhoto() {
    navigate('/home');
  }

  return (
    <Page>
      <Card>
        <Logo>
          <h1>Élan</h1>
          <p>{status === 'photo' ? "You're all set!" : 'Set up your password'}</p>
        </Logo>

        {status === 'checking' && (
          <CenterMsg>Checking your invite link…</CenterMsg>
        )}

        {status === 'invalid' && (
          <>
            <BigIcon>⚠️</BigIcon>
            <CenterMsg>This invite link isn't valid. Please check the link from your email, or contact your instructor.</CenterMsg>
          </>
        )}

        {status === 'expired' && (
          <>
            <BigIcon>⌛</BigIcon>
            <CenterMsg>This invite link has expired. Please contact your instructor for a new one.</CenterMsg>
          </>
        )}

        {status === 'used' && (
          <>
            <BigIcon>✅</BigIcon>
            <CenterMsg>This invite has already been used. If this is your account, try signing in instead.</CenterMsg>
          </>
        )}

        {status === 'valid' && invite && (
          <>
            <EmailChip>{invite.email}</EmailChip>

            <Field>
              <label>Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field>
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </Field>

            <SubmitBtn onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creating account…' : 'Set Password & Continue'}
            </SubmitBtn>

            {error && <ErrorMsg>{error}</ErrorMsg>}
          </>
        )}

        {status === 'photo' && (
          <>
            <AvatarPickRow>
              <AvatarWrap onClick={handlePickPhoto} title="Add a profile photo">
                <BigAvatar>
                  {photoPreview ? <img src={photoPreview} alt="Preview" /> : (invite?.name?.[0]?.toUpperCase() || '?')}
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
              <AvatarHint>
                {photoPreview ? 'Looking good! Tap to change.' : 'Want to add a profile photo?'}
              </AvatarHint>
            </AvatarPickRow>

            {photoError && <ErrorMsg>{photoError}</ErrorMsg>}

            <SubmitBtn onClick={handleSavePhotoAndContinue} disabled={uploadingPhoto}>
              {uploadingPhoto ? 'Uploading…' : photoPreview ? 'Save Photo & Continue' : 'Continue'}
            </SubmitBtn>
            <SkipBtn onClick={handleSkipPhoto} disabled={uploadingPhoto}>
              Skip for now
            </SkipBtn>
          </>
        )}

        {status !== 'photo' && <BackLink to="/login">← Back to sign in</BackLink>}
      </Card>
    </Page>
  );
}