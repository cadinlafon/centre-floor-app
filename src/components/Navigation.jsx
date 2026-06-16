export default function Navigation({
  role,
  userData,
  activeTab,
  setActiveTab
}) {
  return (
    <footer style={footerStyle}>
      {role === "admin" && (
        <>
          <button onClick={() => setActiveTab("dashboard")}>
            Dashboard
          </button>

           <button onClick={() => setActiveTab("calendar")}>
            Calendar
          </button>

          <button onClick={() => setActiveTab("all-students")}>
            All Students
          </button>

          <button onClick={() => setActiveTab("mon-wed")}>
            Mon/Wed
          </button>

          <button onClick={() => setActiveTab("tue-thur")}>
            Tue/Thu
          </button>

          <button onClick={() => setActiveTab("both")}>
            Both
          </button>
        </>
      )}

      {role === "student" && (
        <>
          <button onClick={() => setActiveTab("all-students")}>
            All Students
          </button>

          {(userData?.classSchedule === "mon-wed" ||
            userData?.classSchedule === "both") && (
            <button onClick={() => setActiveTab("mon-wed")}>
              Mon/Wed
            </button>
          )}

          {(userData?.classSchedule === "tue-thur" ||
            userData?.classSchedule === "both") && (
            <button onClick={() => setActiveTab("tue-thur")}>
              Tue/Thu
            </button>
          )}
        </>
      )}
    </footer>
  );
}

const footerStyle = {
  height: '60px',
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  borderTop: '1px solid #E2E8F0',
  background: '#fff'
};