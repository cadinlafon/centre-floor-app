export default function AdminPanel({
  totalActiveCount,
  pendingUsers,
  activeStudents
}) {
  return (
    <div style={{ padding: '20px' }}>
      <h2>
        Active Students:
        {totalActiveCount}
      </h2>

      <h3>
        Pending Approvals
      </h3>

      {pendingUsers.map((user) => (
        <div key={user.id}>
          {user.name}
        </div>
      ))}

      <h3>
        Active Roster
      </h3>

      {activeStudents.map((student) => (
        <div key={student.id}>
          {student.name}
        </div>
      ))}
    </div>
  );
}