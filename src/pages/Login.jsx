import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  signInWithEmailAndPassword, sendPasswordResetEmail, signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import styled from 'styled-components';

// ─── Styles ──────────────────────────────────────────────────────────────────

const Page = styled.div`
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
`;

const Card = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px var(--shadow);
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 2rem;
    color: var(--brown-dark);
    margin: 0 0 0.25rem;
  }

  p {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin: 0;
  }
`;

const Field = styled.div`
  margin-bottom: 1.25rem;

  label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    font-size: 1rem;
    color: var(--text-primary);
    background: var(--bg-secondary);
    box-sizing: border-box;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: var(--amber);
    }
  }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #78350f 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0.75rem 0 0;
  text-align: center;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0;
  color: var(--text-muted);
  font-size: 0.85rem;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
`;

const RequestBtn = styled(Link)`
  display: block;
  text-align: center;
  padding: 0.875rem;
  border: 1.5px solid var(--amber);
  border-radius: 10px;
  color: var(--amber);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: var(--amber);
    color: white;
  }
`;

const ForgotLink = styled.button`
  display: block;
  margin: 0.75rem auto 0;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;

  &:hover { color: var(--amber); }
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1.5rem;
`;

const ModalCard = styled.div`
  background: var(--bg-card);
  border-radius: 16px;
  padding: 2rem 1.75rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);

  h2 {
    font-family: Georgia, serif;
    font-size: 1.3rem;
    color: var(--brown-dark);
    margin: 0 0 0.5rem;
  }

  p {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }
`;

const ModalBtns = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const SendResetBtn = styled.button`
  flex: 1;
  padding: 0.7rem;
  background: linear-gradient(135deg, #78350f, #d97706);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const CancelModalBtn = styled.button`
  flex: 1;
  padding: 0.7rem;
  background: var(--bg-secondary);
  border: 1.5px solid var(--border);
  color: var(--text-secondary);
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot password
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

      const profileSnap = await getDoc(doc(db, 'users', cred.user.uid));

      if (!profileSnap.exists()) {
        await signOut(auth);
        setError('Your account setup is incomplete. Please contact your instructor.');
        return;
      }

      const status = profileSnap.data().status;
      if (status === 'pending') {
        navigate('/pending');
      } else if (status === 'approved') {
        navigate('/home');
      } else {
        await signOut(auth);
        setError('Your account status is unrecognized. Please contact your instructor.');
      }
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Incorrect email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Try again later.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  function openForgotModal() {
    setResetEmail(email); // prefill with whatever they already typed
    setResetError('');
    setResetSent(false);
    setShowForgotModal(true);
  }

  async function handleSendReset() {
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetSending(true);
    setResetError('');

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim().toLowerCase());
      setResetSent(true);
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/invalid-email') {
        setResetError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setResetError('Too many attempts. Please try again later.');
      } else {
        // Firebase's user-not-found case is intentionally treated the same
        // as success below, so this doesn't leak which emails have accounts.
        setResetSent(true);
      }
    } finally {
      setResetSending(false);
    }
  }

  return (
    <Page>
      <Card>
        <Logo>
          <h1>Élan</h1>
          <p>Sign in to your account</p>
        </Logo>

        <Field>
          <label>Email</label>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
          />
        </Field>

        <Field>
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
          />
        </Field>

        <SubmitBtn onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </SubmitBtn>

        {error && <ErrorMsg>{error}</ErrorMsg>}

        <ForgotLink onClick={openForgotModal}>Forgot password?</ForgotLink>

        <Divider>or</Divider>

        <RequestBtn to="/request-access">
          Request Access
        </RequestBtn>
      </Card>

      {showForgotModal && (
        <Modal onClick={e => e.target === e.currentTarget && setShowForgotModal(false)}>
          <ModalCard>
            {resetSent ? (
              <>
                <h2>Check your email</h2>
                <p>
                  If an account exists for <strong>{resetEmail}</strong>, we've sent a link to reset your password.
                  It may take a few minutes to arrive — check your spam folder too.
                </p>
                <ModalBtns>
                  <SendResetBtn onClick={() => setShowForgotModal(false)}>
                    Got it
                  </SendResetBtn>
                </ModalBtns>
              </>
            ) : (
              <>
                <h2>Reset your password</h2>
                <p>Enter your email and we'll send you a link to reset your password.</p>

                <Field style={{ marginBottom: '0.5rem' }}>
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendReset(); }}
                    autoComplete="email"
                    autoFocus
                  />
                </Field>

                {resetError && <ErrorMsg>{resetError}</ErrorMsg>}

                <ModalBtns>
                  <CancelModalBtn onClick={() => setShowForgotModal(false)} disabled={resetSending}>
                    Cancel
                  </CancelModalBtn>
                  <SendResetBtn onClick={handleSendReset} disabled={resetSending}>
                    {resetSending ? 'Sending…' : 'Send Reset Link'}
                  </SendResetBtn>
                </ModalBtns>
              </>
            )}
          </ModalCard>
        </Modal>
      )}
    </Page>
  );
}