import { useState } from 'react';
import { auth, db } from '../config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignupApplication = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();

    try {
      // ─────────────────────────────
      // 1. Prevent duplicates (Firestore check)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setMessageType('info');
        setMessage('This email is already registered or pending approval.');
        setLoading(false);
        return;
      }

      // ─────────────────────────────
      // 2. Create Firebase Auth user
      // (temporary password - user will reset later)
      const tempPassword =
        Math.random().toString(36).slice(-10) + 'A1!';

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        tempPassword
      );

      const uid = userCredential.user.uid;

      // ─────────────────────────────
      // 3. Create Firestore profile (pending)
      await addDoc(collection(db, 'users'), {
        uid,
        name: name.trim(),
        email: cleanEmail,
        role: 'student',
        status: 'pending',
        classSchedule: 'none',
        createdAt: new Date().toISOString(),
      });

      // ─────────────────────────────
      // 4. Success UI
      setMessageType('success');
      setMessage(
        "Application submitted! You will receive a setup email after approval."
      );

      setName('');
      setEmail('');

    } catch (error) {
      console.error("Signup error:", error);

      setMessageType('error');

      if (error.code === 'auth/email-already-in-use') {
        setMessage('This email already has an account.');
      } else {
        setMessage('Something went wrong. Please try again.');
      }
    }

    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={logoAreaStyle}>
          <div style={logoMarkStyle}>CF</div>
          <h1 style={headingStyle}>Join Centre Floor</h1>
          <p style={subheadingStyle}>
            Request access to your class group channels
          </p>
        </div>

        <form onSubmit={handleSignupApplication}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Full name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={
              loading
                ? { ...buttonStyle, opacity: 0.7 }
                : buttonStyle
            }
          >
            {loading ? 'Submitting…' : 'Request Access'}
          </button>
        </form>

        {message && (
          <div
            style={
              messageType === 'success'
                ? successMessageStyle
                : messageType === 'error'
                ? errorMessageStyle
                : infoMessageStyle
            }
          >
            {message}
          </div>
        )}

        <p style={footerTextStyle}>
          Already have an account?{' '}
          <a href="/login" style={linkStyle}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────
   Styles (unchanged)
───────────────────────────── */

const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: '#fdf8f3',
  padding: '20px',
  fontFamily: "'Georgia', serif",
};

const cardStyle = {
  background: '#ffffff',
  padding: '44px 40px',
  borderRadius: '16px',
  boxShadow: '0 4px 24px rgba(139,90,43,0.10)',
  maxWidth: '420px',
  width: '100%',
  border: '1px solid #e8ddd0',
};

const logoAreaStyle = { textAlign: 'center', marginBottom: '32px' };

const logoMarkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '56px',
  height: '56px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, #c47f3a 0%, #8b5a2b 100%)',
  color: '#fff',
  fontSize: '1.2rem',
  fontWeight: '700',
  letterSpacing: '0.5px',
  marginBottom: '14px',
};

const headingStyle = {
  margin: '0 0 6px',
  fontSize: '1.7rem',
  color: '#3d2b1a',
  fontWeight: '700',
};

const subheadingStyle = {
  margin: 0,
  fontSize: '0.92rem',
  color: '#8a7060',
  fontFamily: "'system-ui', sans-serif",
};

const inputGroupStyle = {
  marginBottom: '20px',
  display: 'flex',
  flexDirection: 'column',
};

const labelStyle = {
  fontFamily: "'system-ui', sans-serif",
  fontWeight: '600',
  fontSize: '0.82rem',
  color: '#5a3e2b',
  marginBottom: '7px',
  textTransform: 'uppercase',
};

const inputStyle = {
  padding: '11px 14px',
  borderRadius: '8px',
  border: '1.5px solid #d9c8b5',
  fontSize: '0.97rem',
  color: '#3d2b1a',
  background: '#fffaf6',
  outline: 'none',
};

const buttonStyle = {
  width: '100%',
  background: 'linear-gradient(135deg, #c47f3a 0%, #8b5a2b 100%)',
  color: '#fff',
  border: 'none',
  padding: '13px',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: '700',
  cursor: 'pointer',
  marginTop: '8px',
};

const baseMessageStyle = {
  marginTop: '20px',
  padding: '13px 16px',
  borderRadius: '8px',
  fontSize: '0.9rem',
};

const successMessageStyle = {
  ...baseMessageStyle,
  backgroundColor: '#f6f0e8',
  border: '1px solid #d9c8b5',
  color: '#5a3e2b',
};

const errorMessageStyle = {
  ...baseMessageStyle,
  backgroundColor: '#fff5f0',
  border: '1px solid #f5c6a8',
  color: '#8b3a1a',
};

const infoMessageStyle = {
  ...baseMessageStyle,
  backgroundColor: '#fdfaf6',
  border: '1px solid #e8ddd0',
  color: '#8a7060',
};

const footerTextStyle = {
  marginTop: '24px',
  textAlign: 'center',
  fontSize: '0.88rem',
  color: '#8a7060',
};

const linkStyle = {
  color: '#c47f3a',
  fontWeight: '700',
  textDecoration: 'none',
};