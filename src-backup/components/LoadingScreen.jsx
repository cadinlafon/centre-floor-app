export default function LoadingScreen() {
  return (
    <div style={wrapperStyle}>
      <div style={containerStyle}>
        <img
          src="/centre-floor-logo.png"
          alt="Centre Floor Logo"
          style={logoStyle}
        />
        <div style={spinnerStyle}></div>
      </div>
    </div>
  );
}

const wrapperStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  width: '100vw',
  backgroundColor: '#FFFFFF'
};

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '20px'
};

const logoStyle = {
  maxWidth: '160px'
};

const spinnerStyle = {
  width: '32px',
  height: '32px',
  border: '3px solid #E2E8F0',
  borderTop: '3px solid #3182CE',
  borderRadius: '50%'
};