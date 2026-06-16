import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const email = searchParams.get('email');

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) return setError("Passwords don't match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email), where('status', '==', 'approved'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("No approved application found for this email. Please contact your instructor.");
      }

      const userDoc = querySnapshot.docs[0];
      const userDocRef = doc(db, 'users', userDoc.id);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      await updateDoc(userDocRef, { uid: newUser.uid, status: 'active' });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create account.");
    }
    setLoading(false);
  };

  if (!email) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={logoMarkStyle}>CF</div>
          <p style={{ color: '#8a7060', textAlign: 'center', fontFamily: "'system-ui', sans-serif", marginTop: '16px' }}>
            Invalid link. Please request a new invite from your instructor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={logoAreaStyle}>
          <div style={logoMarkStyle}>CF</div>
          <h1 style={headingStyle}>Almost there!</h1>
          <p style={subheadingStyle}>
            Set a password for <strong style={{ color: '#5a3e2b' }}>{email}</strong>
          </p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSetPassword}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Create a password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="Min. 6 characters"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={loading ? { ...buttonStyle, opacity: 0.7 } : buttonStyle}
          >
            {loading ? 'Creating account…' : 'Enter the App'}
          </button>
        </form>
      </div>
    </div>
  );
}

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
  letterSpacing: '-0.3px',
};
const subheadingStyle = {
  margin: 0,
  fontSize: '0.92rem',
  color: '#8a7060',
  fontFamily: "'system-ui', sans-serif",
};
const errorStyle = {
  backgroundColor: '#fff5f0',
  border: '1px solid #f5c6a8',
  color: '#8b3a1a',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.88rem',
  marginBottom: '20px',
  fontFamily: "'system-ui', sans-serif",
};
const inputGroupStyle = { marginBottom: '20px', display: 'flex', flexDirection: 'column' };
const labelStyle = {
  fontFamily: "'system-ui', sans-serif",
  fontWeight: '600',
  fontSize: '0.82rem',
  color: '#5a3e2b',
  marginBottom: '7px',
  letterSpacing: '0.3px',
  textTransform: 'uppercase',
};
const inputStyle = {
  padding: '11px 14px',
  borderRadius: '8px',
  border: '1.5px solid #d9c8b5',
  fontSize: '0.97rem',
  color: '#3d2b1a',
  background: '#fffaf6',
  fontFamily: "'system-ui', sans-serif",
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
  fontFamily: "'system-ui', sans-serif",
  boxShadow: '0 2px 8px rgba(139,90,43,0.25)',
};