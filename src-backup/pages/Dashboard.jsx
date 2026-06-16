import { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../config';
import { doc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import LoadingScreen from '../components/LoadingScreen';

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);
  const [totalActiveCount, setTotalActiveCount] = useState(0);
  const [selectedClasses, setSelectedClasses] = useState({});
  const [inviteLinks, setInviteLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. Initial Identity Verification & Role Loading
  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) { setLoading(false); return; }
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const data = userDoc.data();
          setUserData(data);
          setRole(data.role);
          setActiveTab(data.role === 'admin' ? 'dashboard' : 'all-students');
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };
    fetchProfile();
  }, []);

  // 2. Admin: Pending Applications
  useEffect(() => {
    if (role !== 'admin') return;
    const q = query(collection(db, 'users'), where('status', '==', 'pending'), where('role', '==', 'student'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = [];
      snapshot.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));
      setPendingUsers(users);
    });
    return () => unsubscribe();
  }, [role]);

  // 3. Admin: Active Students
  useEffect(() => {
    if (role !== 'admin') return;
    const q = query(collection(db, 'users'), where('status', '==', 'approved'), where('role', '==', 'student'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const students = [];
      snapshot.forEach((doc) => students.push({ id: doc.id, ...doc.data() }));
      setActiveStudents(students);
      setTotalActiveCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [role]);

  // 4. Chat stream listener
  useEffect(() => {
    if (!activeTab || activeTab === 'dashboard') { setMessages([]); return; }
    const q = query(collection(db, 'threads', activeTab, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [activeTab]);

  // 5. Admin: Approve student
  const approveUser = async (user) => {
    const classSchedule = selectedClasses[user.id];
    if (!classSchedule || classSchedule === 'none') return alert("Please assign a class schedule!");
    try {
      await updateDoc(doc(db, 'users', user.id), { status: 'approved', classSchedule });
      const generatedLink = `${window.location.origin}/set-password?email=${encodeURIComponent(user.email)}`;
      setInviteLinks(prev => ({ ...prev, [user.id]: generatedLink }));
      alert(`Approved ${user.name}! Setup link generated.`);
    } catch (e) { alert("Error approving student."); }
  };

  // 6. Admin: Modify class
  const handleModifyClass = async (studentId, newClass) => {
    if (newClass === 'none') return;
    try {
      await updateDoc(doc(db, 'users', studentId), { classSchedule: newClass });
      alert("Schedule updated.");
    } catch (err) { alert("Failed to update schedule."); }
  };

  // 7. Admin: Delete student
  const handleDeleteStudent = async (student) => {
    const confirmDelete = window.confirm(`Permanently remove ${student.name} from the roster?`);
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'users', student.id));
    } catch (err) { alert("Error removing student."); }
  };

  // 8. Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setUploading(true);
    let mediaUrl = null;
    let mediaType = 'text';
    try {
      if (file) {
        const fileRef = ref(storage, `chats/${activeTab}/${Date.now()}_${file.name}`);
        const result = await uploadBytes(fileRef, file);
        mediaUrl = await getDownloadURL(result.ref);
        if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type.startsWith('video/')) mediaType = 'video';
        else if (file.type.includes('pdf')) mediaType = 'pdf';
        else mediaType = 'file';
      }
      await addDoc(collection(db, 'threads', activeTab, 'messages'), {
        senderId: auth.currentUser.uid,
        senderName: userData?.name || 'User',
        text: text.trim(),
        timestamp: serverTimestamp(),
        mediaUrl, mediaType,
        fileName: file ? file.name : null,
      });
      setText('');
      setFile(null);
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
    }
    setUploading(false);
  };

  if (loading) return <LoadingScreen />;

  // Tab label helpers
  const tabLabel = (tab) => {
    const labels = { 'dashboard': 'Dashboard', 'all-students': 'All Students', 'mon-wed': 'Mon / Wed', 'tue-thur': 'Tue / Thu', 'both': 'Both Classes' };
    return labels[tab] || tab;
  };

  return (
    <div style={appWrapperStyle}>
      {/* ── Header ── */}
      <header style={topHeaderStyle}>
        <div>
          <span style={headerLogoStyle}>CF</span>
          <div style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '10px' }}>
            <div style={headerTitleStyle}>Centre Floor</div>
            <div style={headerSubStyle}>Welcome back, {userData?.name}</div>
          </div>
        </div>
        <button onClick={() => signOut(auth)} style={signOutButtonStyle}>Sign Out</button>
      </header>

      {/* ── Main ── */}
      <div style={mainContentAreaStyle}>

        {/* VIEW A: Admin Dashboard */}
        {activeTab === 'dashboard' && role === 'admin' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Stat card */}
            <div style={statCardStyle}>
              <span style={statLabelStyle}>Registered students</span>
              <div style={statNumberStyle}>{totalActiveCount}</div>
            </div>

            {/* Pending approvals */}
            <div>
              <h3 style={sectionHeadingStyle}>Pending approvals</h3>
              {pendingUsers.length === 0 ? (
                <div style={emptyStateStyle}>All caught up — no pending applications.</div>
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
                      {pendingUsers.map((u, i) => (
                        <tr key={u.id} style={i % 2 === 0 ? trEvenStyle : trOddStyle}>
                          <td style={tdStyle}>
                            <span style={studentNameStyle}>{u.name}</span>
                            <span style={studentEmailStyle}>{u.email}</span>
                          </td>
                          <td style={tdStyle}>
                            <select onChange={(e) => setSelectedClasses(p => ({ ...p, [u.id]: e.target.value }))} style={selectStyle}>
                              <option value="none">— Select —</option>
                              <option value="mon-wed">Mon / Wed</option>
                              <option value="tue-thur">Tue / Thu</option>
                              <option value="both">Both</option>
                            </select>
                          </td>
                          <td style={tdStyle}>
                            {inviteLinks[u.id] ? (
                              <button onClick={() => { navigator.clipboard.writeText(inviteLinks[u.id]); alert("Link copied!"); }} style={copyBtnStyle}>
                                Copy link
                              </button>
                            ) : (
                              <button onClick={() => approveUser(u)} style={approveBtnStyle}>Approve</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Active roster */}
            <div>
              <h3 style={sectionHeadingStyle}>Active roster ({totalActiveCount})</h3>
              {activeStudents.length === 0 ? (
                <div style={emptyStateStyle}>No active students yet.</div>
              ) : (
                <div style={tableCardStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={theadRowStyle}>
                        <th style={thStyle}>Student</th>
                        <th style={thStyle}>Group</th>
                        <th style={thStyle}>Change class</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudents.map((student, i) => (
                        <tr key={student.id} style={i % 2 === 0 ? trEvenStyle : trOddStyle}>
                          <td style={tdStyle}>
                            <span style={studentNameStyle}>{student.name}</span>
                            <span style={studentEmailStyle}>{student.email}</span>
                          </td>
                          <td style={tdStyle}>
                            <span style={scheduleBadgeStyle(student.classSchedule)}>
                              {student.classSchedule === 'both' ? 'Mon–Thu' : student.classSchedule === 'mon-wed' ? 'Mon / Wed' : 'Tue / Thu'}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <select
                              defaultValue={student.classSchedule}
                              onChange={(e) => handleModifyClass(student.id, e.target.value)}
                              style={selectStyle}
                            >
                              <option value="mon-wed">Mon / Wed</option>
                              <option value="tue-thur">Tue / Thu</option>
                              <option value="both">Both</option>
                            </select>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <button onClick={() => handleDeleteStudent(student)} style={deleteButtonStyle} title="Remove student">
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW B: Chat */}
        {activeTab !== 'dashboard' && (
          <div style={chatViewFrameStyle}>
            <div style={messageScrollerStyle}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#b8a898', fontFamily: "'system-ui', sans-serif", fontSize: '0.9rem', padding: '40px 20px' }}>
                  No messages yet — say hello!
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === auth.currentUser?.uid;
                const timestamp = msg.timestamp?.toDate?.();
                const formattedTime = timestamp
                  ? timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                  : '';
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', margin: '6px 0' }}>
                    <div style={isMe ? myBubbleStyle : theirBubbleStyle}>
                      <div style={{ ...msgNameStyle, color: isMe ? 'rgba(255,255,255,0.75)' : '#8a7060' }}>{msg.senderName}</div>
                      {msg.text && <p style={{ margin: '3px 0 0', fontSize: '0.95rem', lineHeight: '1.5' }}>{msg.text}</p>}
                      {msg.mediaType === 'image' && <img src={msg.mediaUrl} alt="" style={{ maxWidth: '100%', borderRadius: '6px', marginTop: '4px' }} />}
                      {msg.mediaType === 'video' && <video src={msg.mediaUrl} controls style={{ maxWidth: '100%', borderRadius: '6px', marginTop: '4px' }} />}
                      {(msg.mediaType === 'pdf' || msg.mediaType === 'file') && (
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '4px', fontSize: '0.85rem', color: isMe ? 'rgba(255,255,255,0.85)' : '#c47f3a', fontFamily: "'system-ui', sans-serif" }}>
                          📄 Download attachment
                        </a>
                      )}
                      {formattedTime && (
                        <div style={{ ...msgMetaStyle, color: isMe ? 'rgba(255,255,255,0.45)' : '#c4b5a5', textAlign: isMe ? 'right' : 'left' }}>
                          {formattedTime}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose bar */}
            <form onSubmit={handleSendMessage} style={chatDockStyle}>
              <input type="file" accept="image/*,video/*,application/pdf" id="file-clip" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
              <label htmlFor="file-clip" style={{ ...clipLabelStyle, background: file ? '#c47f3a' : '#f0e8dc', color: file ? '#fff' : '#8a7060' }}>
                {file ? '✓' : '📎'}
              </label>
              <input
                type="text"
                placeholder={file ? `File: ${file.name}` : "Type a message…"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={chatInputStyle}
              />
              <button type="submit" disabled={uploading} style={sendButtonStyle}>
                {uploading ? '…' : 'Send'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <footer style={bottomNavStyle}>
        {role === 'admin' && ['dashboard', 'all-students', 'mon-wed', 'tue-thur', 'both'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabButtonStyle(activeTab === tab)}>
            {tabLabel(tab)}
          </button>
        ))}
        {role === 'student' && (
          <>
            <button onClick={() => setActiveTab('all-students')} style={tabButtonStyle(activeTab === 'all-students')}>All Students</button>
            {userData?.classSchedule === 'mon-wed' && <button onClick={() => setActiveTab('mon-wed')} style={tabButtonStyle(activeTab === 'mon-wed')}>Mon / Wed</button>}
            {userData?.classSchedule === 'tue-thur' && <button onClick={() => setActiveTab('tue-thur')} style={tabButtonStyle(activeTab === 'tue-thur')}>Tue / Thu</button>}
            {userData?.classSchedule === 'both' && (
              <>
                <button onClick={() => setActiveTab('mon-wed')} style={tabButtonStyle(activeTab === 'mon-wed')}>Mon / Wed</button>
                <button onClick={() => setActiveTab('tue-thur')} style={tabButtonStyle(activeTab === 'tue-thur')}>Tue / Thu</button>
              </>
            )}
          </>
        )}
      </footer>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────

const appWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  fontFamily: "'Georgia', serif",
  backgroundColor: '#fdf8f3',
};
const topHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 20px',
  background: '#ffffff',
  borderBottom: '1px solid #e8ddd0',
  boxShadow: '0 1px 4px rgba(139,90,43,0.06)',
};
const headerLogoStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '9px',
  background: 'linear-gradient(135deg, #c47f3a 0%, #8b5a2b 100%)',
  color: '#fff',
  fontSize: '0.85rem',
  fontWeight: '700',
  verticalAlign: 'middle',
};
const headerTitleStyle = {
  fontSize: '1rem',
  fontWeight: '700',
  color: '#3d2b1a',
  lineHeight: 1.2,
};
const headerSubStyle = {
  fontSize: '0.75rem',
  color: '#8a7060',
  fontFamily: "'system-ui', sans-serif",
};
const signOutButtonStyle = {
  padding: '7px 16px',
  background: 'transparent',
  color: '#8a7060',
  border: '1.5px solid #d9c8b5',
  borderRadius: '7px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '0.82rem',
  fontFamily: "'system-ui', sans-serif",
};
const mainContentAreaStyle = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
};
const bottomNavStyle = {
  height: '58px',
  background: '#ffffff',
  borderTop: '1px solid #e8ddd0',
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'stretch',
  boxShadow: '0 -1px 6px rgba(139,90,43,0.05)',
};
const tabButtonStyle = (isActive) => ({
  flex: 1,
  background: 'none',
  border: 'none',
  borderTop: isActive ? '3px solid #c47f3a' : '3px solid transparent',
  cursor: 'pointer',
  fontSize: '0.78rem',
  color: isActive ? '#8b5a2b' : '#8a7060',
  fontWeight: isActive ? '700' : '500',
  fontFamily: "'system-ui', sans-serif",
  transition: 'all 0.15s',
});

// Admin dashboard
const sectionHeadingStyle = {
  margin: '0 0 14px',
  fontSize: '1.05rem',
  color: '#3d2b1a',
  fontWeight: '700',
};
const statCardStyle = {
  background: '#ffffff',
  padding: '20px 24px',
  borderRadius: '12px',
  border: '1px solid #e8ddd0',
  boxShadow: '0 2px 8px rgba(139,90,43,0.06)',
  display: 'inline-block',
};
const statLabelStyle = {
  fontSize: '0.78rem',
  color: '#8a7060',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: "'system-ui', sans-serif",
};
const statNumberStyle = {
  fontSize: '2.4rem',
  color: '#8b5a2b',
  fontWeight: '700',
  marginTop: '4px',
};
const emptyStateStyle = {
  padding: '24px',
  textAlign: 'center',
  background: '#fffaf6',
  borderRadius: '10px',
  border: '1px dashed #d9c8b5',
  color: '#8a7060',
  fontFamily: "'system-ui', sans-serif",
  fontSize: '0.9rem',
};
const tableCardStyle = {
  background: '#ffffff',
  borderRadius: '10px',
  border: '1px solid #e8ddd0',
  boxShadow: '0 2px 8px rgba(139,90,43,0.06)',
  overflow: 'hidden',
};
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const theadRowStyle = { backgroundColor: '#f6f0e8', borderBottom: '2px solid #e8ddd0' };
const thStyle = {
  padding: '12px 16px',
  color: '#5a3e2b',
  fontWeight: '700',
  fontSize: '0.78rem',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  fontFamily: "'system-ui', sans-serif",
};
const trEvenStyle = { borderBottom: '1px solid #f0e8dc' };
const trOddStyle = { borderBottom: '1px solid #f0e8dc', backgroundColor: '#fffaf6' };
const tdStyle = { padding: '12px 16px', verticalAlign: 'middle', fontFamily: "'system-ui', sans-serif" };
const studentNameStyle = { display: 'block', fontWeight: '600', color: '#3d2b1a', fontSize: '0.9rem' };
const studentEmailStyle = { display: 'block', color: '#8a7060', fontSize: '0.8rem', marginTop: '2px' };
const selectStyle = {
  padding: '7px 10px',
  borderRadius: '7px',
  border: '1.5px solid #d9c8b5',
  background: '#fffaf6',
  color: '#3d2b1a',
  fontSize: '0.87rem',
  cursor: 'pointer',
  fontFamily: "'system-ui', sans-serif",
};
const approveBtnStyle = {
  background: 'linear-gradient(135deg, #c47f3a 0%, #8b5a2b 100%)',
  color: '#fff',
  border: 'none',
  padding: '7px 16px',
  borderRadius: '7px',
  fontWeight: '700',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontFamily: "'system-ui', sans-serif",
  boxShadow: '0 2px 5px rgba(139,90,43,0.2)',
};
const copyBtnStyle = {
  background: '#f6f0e8',
  color: '#5a3e2b',
  border: '1.5px solid #d9c8b5',
  padding: '7px 16px',
  borderRadius: '7px',
  fontWeight: '700',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontFamily: "'system-ui', sans-serif",
};
const deleteButtonStyle = {
  background: 'none',
  border: '1.5px solid #e8ddd0',
  color: '#b8a898',
  borderRadius: '6px',
  width: '30px',
  height: '30px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const scheduleBadgeStyle = (schedule) => ({
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: '12px',
  fontSize: '0.78rem',
  fontWeight: '700',
  fontFamily: "'system-ui', sans-serif",
  backgroundColor: schedule === 'both' ? '#f0ebe0' : schedule === 'mon-wed' ? '#fdf3e7' : '#fdf8f0',
  color: schedule === 'both' ? '#5a3e2b' : schedule === 'mon-wed' ? '#8b5a2b' : '#c47f3a',
  border: '1px solid #e8ddd0',
});

// Chat view
const chatViewFrameStyle = { flex: 1, display: 'flex', flexDirection: 'column', height: '100%' };
const messageScrollerStyle = {
  flex: 1,
  padding: '16px',
  overflowY: 'auto',
  backgroundColor: '#fdf8f3',
};
const myBubbleStyle = {
  padding: '9px 14px',
  borderRadius: '14px 14px 2px 14px',
  maxWidth: '75%',
  background: 'linear-gradient(135deg, #c47f3a 0%, #8b5a2b 100%)',
  color: '#fff',
  boxShadow: '0 2px 6px rgba(139,90,43,0.2)',
};
const theirBubbleStyle = {
  padding: '9px 14px',
  borderRadius: '14px 14px 14px 2px',
  maxWidth: '75%',
  backgroundColor: '#ffffff',
  color: '#3d2b1a',
  border: '1px solid #e8ddd0',
  boxShadow: '0 1px 4px rgba(139,90,43,0.06)',
};
const msgNameStyle = {
  fontSize: '0.72rem',
  fontWeight: '600',
  fontFamily: "'system-ui', sans-serif",
  marginBottom: '1px',
  lineHeight: 1,
};
const msgMetaStyle = {
  fontSize: '0.68rem',
  marginTop: '6px',
  fontFamily: "'system-ui', sans-serif",
  fontWeight: '400',
  lineHeight: 1,
};
const chatDockStyle = {
  display: 'flex',
  gap: '8px',
  padding: '10px 12px',
  background: '#ffffff',
  borderTop: '1px solid #e8ddd0',
  alignItems: 'center',
};
const clipLabelStyle = {
  padding: '10px 13px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
  transition: 'background 0.15s',
};
const chatInputStyle = {
  flex: 1,
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid #d9c8b5',
  fontSize: '0.95rem',
  color: '#3d2b1a',
  background: '#fffaf6',
  fontFamily: "'system-ui', sans-serif",
  outline: 'none',
};
const sendButtonStyle = {
  background: 'linear-gradient(135deg, #c47f3a 0%, #8b5a2b 100%)',
  color: '#fff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '8px',
  fontWeight: '700',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontFamily: "'system-ui', sans-serif",
  boxShadow: '0 2px 6px rgba(139,90,43,0.2)',
};