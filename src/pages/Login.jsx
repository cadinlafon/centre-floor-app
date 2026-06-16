import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config';
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Check approval status
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      const profile = snap.data();

      if (profile?.status === 'pending') {
        navigate('/pending');
      } else {
        navigate('/home');
      }
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Incorrect email or password.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Try again later.');
          break;
        default:
          setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <Page>
      <Card>
        <Logo>
          <h1>Centre Floor</h1>
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

        <Divider>or</Divider>

        <RequestBtn to="/request-access">
          Request Access
        </RequestBtn>
      </Card>
    </Page>
  );
}