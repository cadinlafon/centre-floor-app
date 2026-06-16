export default function Schedule() {
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={headingStyle}>Class Schedule</h1>
        <p style={subheadingStyle}>
          Upcoming sessions, special times, and holiday hours — all in one place.
        </p>
      </div>

      <div style={calendarWrapperStyle}>
        <iframe
          src="https://calendar.google.com/calendar/embed?src=9595cc2ed11dbee0d290750537c7cf020f4bbce20c0fdcec66d74aaa18868313%40group.calendar.google.com&ctz=America%2FPhoenix"
          style={iframeStyle}
          width="100%"
          height="600"
          frameBorder="0"
          scrolling="no"
          title="Google Calendar"
        />
      </div>
    </div>
  );
}

const containerStyle = {
  fontFamily: "'Georgia', serif",
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '40px 20px',
  backgroundColor: '#fdf8f3',
  minHeight: '100vh',
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '32px',
};

const headingStyle = {
  fontSize: '2rem',
  color: '#3d2b1a',
  fontWeight: '700',
  margin: '0 0 10px',
  letterSpacing: '-0.3px',
};

const subheadingStyle = {
  color: '#8a7060',
  fontSize: '1rem',
  margin: 0,
  fontFamily: "'system-ui', sans-serif",
};

const calendarWrapperStyle = {
  background: '#ffffff',
  padding: '20px',
  borderRadius: '16px',
  boxShadow: '0 4px 24px rgba(139,90,43,0.10)',
  border: '1px solid #e8ddd0',
  display: 'flex',
  justifyContent: 'center',
};

const iframeStyle = {
  border: '0',
  borderRadius: '10px',
  maxWidth: '800px',
};