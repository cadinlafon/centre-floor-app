import { useState, useEffect } from 'react';
import { db, auth } from '../config';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';

import { sendPasswordResetEmail } from 'firebase/auth';

export default function Admin() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState({});
  const [inviteLinks, setInviteLinks] = useState({});

  useEffect(() => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = [];
      snapshot.forEach((doc) =>
        users.push({ id: doc.id, ...doc.data() })
      );
      setPendingUsers(users);
    });

    return () => unsubscribe();
  }, []);

  const handleClassChange = (userId, value) => {
    setSelectedClasses((prev) => ({
      ...prev,
      [userId]: value
    }));
  };

  // 🔥 UPDATED APPROVAL LOGIC
  const approveUser = async (user) => {
    const classSchedule = selectedClasses[user.id];

    if (!classSchedule || classSchedule === 'none') {
      alert("Assign a class schedule before approving.");
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.id);

      // 1. Update Firestore user
      await updateDoc(userDocRef, {
        status: 'approved',
        classSchedule
      });

      // 2. Send Firebase password setup email
      await sendPasswordResetEmail(auth, user.email);

      alert(`${user.name} approved and email sent.`);

      // 3. Optional UI tracking (not required anymore)
      setInviteLinks((prev) => ({
        ...prev,
        [user.id]: 'Email sent via Firebase'
      }));

    } catch (error) {
      console.error("Approval error: ", error);
      alert("Failed to approve student.");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={headingStyle}>Admin Dashboard</h1>
        <p style={subheadingStyle}>
          Review new applications, assign classes, and approve users.
        </p>
      </div>

      {pendingUsers.length === 0 ? (
        <div style={emptyStateStyle}>
          <span style={emptyIconStyle}>✓</span>
          <p style={{ margin: '10px 0 0', color: '#8a7060', fontFamily: "'system-ui', sans-serif", fontSize: '0.95rem' }}>
            All caught up — no pending applications right now.
          </p>
        </div>
      ) : (
        <div style={tableCardStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Assign class</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {pendingUsers.map((user, i) => (
                <tr key={user.id} style={i % 2 === 0 ? trEvenStyle : trOddStyle}>
                  <td style={tdStyle}>
                    <span style={studentNameStyle}>{user.name}</span>
                    <span style={studentEmailStyle}>{user.email}</span>
                  </td>

                  <td style={tdStyle}>
                    <select
                      value={selectedClasses[user.id] || 'none'}
                      onChange={(e) =>
                        handleClassChange(user.id, e.target.value)
                      }
                      style={selectStyle}
                    >
                      <option value="none">— Select —</option>
                      <option value="mon-wed">Mon / Wed</option>
                      <option value="tue-thur">Tue / Thu</option>
                      <option value="both">Both classes</option>
                    </select>
                  </td>

                  <td style={tdStyle}>
                    <button
                      onClick={() => approveUser(user)}
                      style={approveButtonStyle}
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================= UI STYLES (UNCHANGED) ================= */

const containerStyle = {
  padding: '40px 24px',
  fontFamily: "'Georgia', serif",
  maxWidth: '960px',
  margin: '0 auto',
  backgroundColor: '#fdf8f3',
  minHeight: '100vh',
};

const headerStyle = { marginBottom: '32px' };

const headingStyle = {
  margin: '0 0 8px',
  fontSize: '1.8rem',
  color: '#3d2b1a',
  fontWeight: '700',
};

const subheadingStyle = {
  margin: 0,
  color: '#8a7060',
  fontSize: '0.92rem',
  fontFamily: "'system-ui', sans-serif",
};

const emptyStateStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '48px 24px',
  backgroundColor: '#fff',
  borderRadius: '12px',
  border: '1px solid #e8ddd0',
  boxShadow: '0 2px 8px rgba(139,90,43,0.06)',
};

const emptyIconStyle = {
  display: 'flex',
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #c47f3a22 0%, #8b5a2b22 100%)',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.3rem',
  color: '#c47f3a',
  fontWeight: 'bold',
};

const tableCardStyle = {
  background: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 2px 12px rgba(139,90,43,0.08)',
  overflow: 'hidden',
  border: '1px solid #e8ddd0',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
};

const theadRowStyle = {
  backgroundColor: '#f6f0e8',
  borderBottom: '2px solid #e8ddd0',
};

const thStyle = {
  padding: '14px 18px',
  color: '#5a3e2b',
  fontWeight: '700',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: "'system-ui', sans-serif",
};

const trEvenStyle = { borderBottom: '1px solid #f0e8dc' };
const trOddStyle = { borderBottom: '1px solid #f0e8dc', backgroundColor: '#fffaf6' };

const tdStyle = {
  padding: '14px 18px',
  verticalAlign: 'middle',
  fontFamily: "'system-ui', sans-serif",
};

const studentNameStyle = {
  display: 'block',
  fontWeight: '600',
  color: '#3d2b1a',
  fontSize: '0.95rem',
};

const studentEmailStyle = {
  display: 'block',
  color: '#8a7060',
  fontSize: '0.82rem',
  marginTop: '2px',
};

const selectStyle = {
  padding: '8px 12px',
  borderRadius: '7px',
  border: '1.5px solid #d9c8b5',
  background: '#fffaf6',
  color: '#3d2b1a',
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontFamily: "'system-ui', sans-serif",
};

const approveButtonStyle = {
  background: 'linear-gradient(135deg, #c47f3a 0%, #8b5a2b 100%)',
  color: '#fff',
  border: 'none',
  padding: '8px 18px',
  borderRadius: '7px',
  fontWeight: '700',
  cursor: 'pointer',
  fontSize: '0.88rem',
  fontFamily: "'system-ui', sans-serif",
  boxShadow: '0 2px 6px rgba(139,90,43,0.2)',
};