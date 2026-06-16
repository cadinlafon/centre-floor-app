import { useState } from 'react';
import { auth } from '../config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={logoAreaStyle}>
          <div style={logoMarkStyle}>CF</div>
          <h1 style={headingStyle}>Centre Floor</h1>
          <p style={subheadingStyle}>Sign in to your class portal</p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={loading ? { ...buttonStyle, opacity: 0.7 } : buttonStyle}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={footerTextStyle}>
          New student?{' '}
          <Link to="/signup" style={linkStyle}>Request access here</Link>
        </p>
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
const logoAreaStyle = {
  textAlign: 'center',
  marginBottom: '32px',
};
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
  transition: 'border-color 0.2s',
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
  letterSpacing: '0.2px',
  boxShadow: '0 2px 8px rgba(139,90,43,0.25)',
};
const footerTextStyle = {
  marginTop: '24px',
  textAlign: 'center',
  fontSize: '0.88rem',
  color: '#8a7060',
  fontFamily: "'system-ui', sans-serif",
};
const linkStyle = {
  color: '#c47f3a',
  fontWeight: '700',
  textDecoration: 'none',
};