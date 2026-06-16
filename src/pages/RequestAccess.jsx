import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
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

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.75rem;

  span {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    background: ${p => p.step >= p.num ? 'linear-gradient(135deg, #78350f, #d97706)' : 'var(--border)'};
    color: ${p => p.step >= p.num ? 'white' : 'var(--text-muted)'};
    transition: all 0.3s;
  }

  div.line {
    flex: 1;
    max-width: 48px;
    height: 2px;
    background: var(--border);
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

const CodeInput = styled.input`
  width: 100%;
  padding: 1rem;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-align: center;
  color: var(--brown-dark);
  background: var(--bg-secondary);
  box-sizing: border-box;
  font-family: 'Courier New', monospace;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--amber);
  }
`;

const PasswordField = styled(Field)``;

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

const InfoMsg = styled.p`
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0.75rem 0 0;
  text-align: center;
  line-height: 1.5;
`;

const BackLink = styled(Link)`
  display: block;
  text-align: center;
  margin-top: 1.25rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  text-decoration: none;

  &:hover { color: var(--amber); }
`;

const ResendBtn = styled.button`
  background: none;
  border: none;
  color: var(--amber);
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;

  &:disabled { color: var(--text-muted); cursor: default; text-decoration: none; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateCode() {
  const part1 = Math.floor(100 + Math.random() * 900);
  const part2 = Math.floor(100 + Math.random() * 900);
  return `${part1}-${part2}`;
}

async function sendConfirmationEmail(name, email, code) {
  // Uses Resend API via a Firebase Cloud Function or direct fetch
  // Replace RESEND_API_KEY with your env var or Cloud Function endpoint
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Centre Floor <noreply@centrefloor.com>',
      to: [email],
      subject: 'Your Centre Floor verification code',
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 2rem; background: #fdf6ec; border-radius: 12px;">
          <h2 style="color: #78350f; margin-bottom: 0.5rem;">Hi ${name}!</h2>
          <p style="color: #57534e;">Here's your verification code to request access to Centre Floor:</p>
          <div style="background: white; border: 2px solid #e7d5b3; border-radius: 10px; padding: 1.5rem; text-align: center; margin: 1.5rem 0;">
            <span style="font-size: 2.5rem; font-weight: 700; letter-spacing: 0.3em; color: #78350f; font-family: 'Courier New', monospace;">${code}</span>
          </div>
          <p style="color: #a8a29e; font-size: 0.85rem;">This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to send email');
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RequestAccess() {
  const [step, setStep] = useState(1); // 1 = info, 2 = verify code, 3 = set password
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  // ── Step 1: Send code ─────────────────────────────────────────────────────

  async function handleSendCode() {
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if email already has a pending/approved account
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError('An account with this email already exists. Try signing in instead.');
        setLoading(false);
        return;
      }

      const code = generateCode();
      await sendConfirmationEmail(name.trim(), email.trim(), code);

      setGeneratedCode(code);
      setCodeExpiry(Date.now() + 15 * 60 * 1000); // 15 min
      setStep(2);

      // Resend cooldown: 60s
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      setError('Failed to send verification email. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify code ───────────────────────────────────────────────────

  function handleVerifyCode() {
    setError('');

    if (Date.now() > codeExpiry) {
      setError('This code has expired. Please request a new one.');
      return;
    }

    if (inputCode.trim() !== generatedCode) {
      setError('Incorrect code. Please check your email and try again.');
      return;
    }

    setStep(3);
  }

  async function handleResendCode() {
    setLoading(true);
    setError('');
    try {
      const code = generateCode();
      await sendConfirmationEmail(name.trim(), email.trim(), code);
      setGeneratedCode(code);
      setCodeExpiry(Date.now() + 15 * 60 * 1000);
      setInputCode('');
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError('Failed to resend. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Set password + create account ─────────────────────────────────

  async function handleCreateAccount() {
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);

      await setDoc(doc(db, 'users', cred.user.uid), {
        name: name.trim(),
        email: email.toLowerCase(),
        role: 'student',
        class: null,          // admin assigns this on approval
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      navigate('/pending');
    } catch (err) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Try signing in.');
          break;
        case 'auth/weak-password':
          setError('Password must be at least 6 characters.');
          break;
        default:
          setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Page>
      <Card>
        <Logo>
          <h1>Centre Floor</h1>
          <p>
            {step === 1 && 'Request access to the app'}
            {step === 2 && 'Check your email'}
            {step === 3 && 'Create your password'}
          </p>
        </Logo>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
          {[1, 2, 3].map((num, i) => (
            <>
              <div key={num} style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700,
                background: step >= num ? 'linear-gradient(135deg, #78350f, #d97706)' : 'var(--border)',
                color: step >= num ? 'white' : 'var(--text-muted)',
                transition: 'all 0.3s',
              }}>{num}</div>
              {i < 2 && <div style={{ flex: 1, maxWidth: 48, height: 2, background: 'var(--border)' }} />}
            </>
          ))}
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <Field>
              <label>Your Name</label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </Field>

            <Field>
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>

            <SubmitBtn onClick={handleSendCode} disabled={loading}>
              {loading ? 'Sending code…' : 'Send Verification Code'}
            </SubmitBtn>

            {error && <ErrorMsg>{error}</ErrorMsg>}
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <InfoMsg>
              We sent a verification code to <strong>{email}</strong>. Enter it below.
            </InfoMsg>

            <div style={{ margin: '1.25rem 0' }}>
              <CodeInput
                type="text"
                placeholder="000-000"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.replace(/[^0-9-]/g, '').slice(0, 7))}
                maxLength={7}
                autoComplete="one-time-code"
              />
            </div>

            <SubmitBtn onClick={handleVerifyCode} disabled={loading}>
              Verify Code
            </SubmitBtn>

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <InfoMsg>
              Didn't get it?{' '}
              <ResendBtn onClick={handleResendCode} disabled={resendCooldown > 0 || loading}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </ResendBtn>
            </InfoMsg>
          </>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <>
            <InfoMsg style={{ marginBottom: '1.25rem' }}>
              Email verified! Now create a password for your account.
            </InfoMsg>

            <PasswordField>
              <label>Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </PasswordField>

            <PasswordField>
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </PasswordField>

            <SubmitBtn onClick={handleCreateAccount} disabled={loading}>
              {loading ? 'Creating account…' : 'Request Access'}
            </SubmitBtn>

            {error && <ErrorMsg>{error}</ErrorMsg>}
          </>
        )}

        <BackLink to="/login">← Back to sign in</BackLink>
      </Card>
    </Page>
  );
}