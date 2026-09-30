import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDocs, query, where, setDoc, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { triggerNotification } from '../utils/notifyServer';
import emailjs from '@emailjs/browser';
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

const StepDots = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1.75rem;
`;
const Dot = styled.div`
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700;
  background: ${p => p.$active ? 'linear-gradient(135deg, #78350f, #d97706)' : 'var(--border)'};
  color: ${p => p.$active ? 'white' : 'var(--text-muted)'};
  transition: all 0.3s;
`;
const DotLine = styled.div`flex: 1; max-width: 48px; height: 2px; background: var(--border);`;

const Field = styled.div`
  margin-bottom: 1.25rem;
  label {
    display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);
    margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;
  }
  input, select {
    width: 100%; padding: 0.75rem 1rem; border: 1.5px solid var(--border);
    border-radius: 10px; font-size: 1rem; color: var(--text-primary);
    background: var(--bg-secondary); box-sizing: border-box; transition: border-color 0.2s;
    &:focus { outline: none; border-color: var(--amber); }
  }
`;

const CodeInput = styled.input`
  width: 100%; padding: 1rem; border: 1.5px solid var(--border); border-radius: 10px;
  font-size: 1.75rem; font-weight: 700; letter-spacing: 0.4em; text-align: center;
  color: var(--brown-dark); background: var(--bg-secondary); box-sizing: border-box;
  font-family: 'Courier New', monospace; transition: border-color 0.2s;
  &:focus { outline: none; border-color: var(--amber); }
`;

const SubmitBtn = styled.button`
  width: 100%; padding: 0.875rem;
  background: linear-gradient(135deg, #78350f 0%, #d97706 100%);
  color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600;
  cursor: pointer; margin-top: 0.5rem; transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`color: #dc2626; font-size: 0.875rem; margin: 0.75rem 0 0; text-align: center;`;
const InfoMsg  = styled.p`color: var(--text-secondary); font-size: 0.875rem; margin: 0.75rem 0 0; text-align: center; line-height: 1.5;`;
const BackLink = styled(Link)`display: block; text-align: center; margin-top: 1.25rem; color: var(--text-muted); font-size: 0.875rem; text-decoration: none; &:hover { color: var(--amber); }`;
const ResendBtn = styled.button`background: none; border: none; color: var(--amber); font-size: 0.875rem; cursor: pointer; padding: 0; text-decoration: underline; &:disabled { color: var(--text-muted); cursor: default; text-decoration: none; }`;

const SuccessIcon = styled.div`font-size: 3rem; text-align: center; margin-bottom: 1rem;`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const EMAILJS_SERVICE_ID = 'service_kmyet4g';
const EMAILJS_TEMPLATE_ID = 'template_o0v471g';
const EMAILJS_PUBLIC_KEY = 'K7Ti5RWt7zcniRrII';

async function sendVerificationEmail(name, email, code) {
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_name: name,
      to_email: email,
      code: code,
    },
    EMAILJS_PUBLIC_KEY
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RequestAccess() {
  const [step, setStep] = useState(1); // 1 = info, 2 = verify code, 3 = success
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
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
      // These duplicate checks require admin read access under the security
      // rules (an anonymous visitor can't list `users`/`accessRequests`), so
      // they silently no-op for the common case — a real duplicate is instead
      // caught server-side when the admin reviews the request.
      try {
        const existingUserSnap = await getDocs(
          query(collection(db, 'users'), where('email', '==', email.toLowerCase()), limit(1))
        );
        if (!existingUserSnap.empty) {
          setError('An account with this email already exists. Try signing in instead.');
          setLoading(false);
          return;
        }

        const existingRequestSnap = await getDocs(
          query(
            collection(db, 'accessRequests'),
            where('email', '==', email.toLowerCase()),
            where('status', '==', 'pending'),
            limit(1)
          )
        );
        if (!existingRequestSnap.empty) {
          setError('You already have a pending request. Please wait for admin approval.');
          setLoading(false);
          return;
        }
      } catch {
        // Permission-denied for an anonymous caller — proceed anyway.
      }

      const code = generateSixDigitCode();
      await sendVerificationEmail(name.trim(), email.trim(), code);

      setGeneratedCode(code);
      setCodeExpiry(Date.now() + 15 * 60 * 1000);
      setStep(2);
      startCooldown();
    } catch (err) {
      setError('Failed to send verification email. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setLoading(true);
    setError('');
    try {
      const code = generateSixDigitCode();
      await sendVerificationEmail(name.trim(), email.trim(), code);
      setGeneratedCode(code);
      setCodeExpiry(Date.now() + 15 * 60 * 1000);
      setInputCode('');
      startCooldown();
    } catch {
      setError('Failed to resend. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify code → create access request ──────────────────────────

  async function submitAccessRequest() {
    setLoading(true);
    try {
      const requestId = doc(collection(db, 'accessRequests')).id;
      await setDoc(doc(db, 'accessRequests', requestId), {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        status: 'pending',
        requestedAt: serverTimestamp(),
      });

      await triggerNotification('access-request', {
        requestId,
        name: name.trim(),
      });

      setStep(3);
    } catch (err) {
      setError('Something went wrong submitting your request. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    setError('');

    if (Date.now() > codeExpiry) {
      setError('This code has expired. Please request a new one.');
      return;
    }
    if (inputCode.trim() !== generatedCode) {
      setError('Incorrect code. Please check your email and try again.');
      return;
    }

    await submitAccessRequest();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Page>
      <Card>
        <Logo>
          <h1>Élan</h1>
          <p>
            {step === 1 && 'Request access to the app'}
            {step === 2 && 'Check your email'}
            {step === 3 && "You're on the list!"}
          </p>
        </Logo>

        {step < 3 && (
          <StepDots>
            <Dot $active={step >= 1}>1</Dot>
            <DotLine />
            <Dot $active={step >= 2}>2</Dot>
          </StepDots>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <Field>
              <label>Your Name</label>
              <input type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field>
              <label>Email Address</label>
              <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
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
            <InfoMsg>We sent a 6-digit code to <strong>{email}</strong>. Enter it below. Verification may take a minute to load, please be patient.</InfoMsg>
            <div style={{ margin: '1.25rem 0' }}>
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
            <SubmitBtn onClick={handleVerifyCode} disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & Submit Request'}
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
            <SuccessIcon>🎉</SuccessIcon>
            <InfoMsg>
              Your request has been sent! The instructor will review it shortly.
              You'll get an email once you're approved, with a link to set up your password.
            </InfoMsg>
          </>
        )}

        <BackLink to="/login">← Back to sign in</BackLink>
      </Card>
    </Page>
  );
}
