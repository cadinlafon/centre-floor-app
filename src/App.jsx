import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GlobalStyles from './GlobalStyles';
import { useState, useEffect } from 'react';
import { auth, db } from './config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Pages - Auth
import Login from './pages/Login';
import RequestAccess from './pages/RequestAccess';
import PendingApproval from './pages/PendingApproval';

// Pages - App
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import ClassChat from './pages/ClassChat';
import MonWed from './pages/MonWed';
import TueThu from './pages/TueThu';
import Announcement from './pages/Announcement';
import Account from './pages/Account';

// Pages - Admin
import AdminOverview from './pages/admin/Overview';
import AdminUsers from './pages/admin/Users';
import AdminAccessApproval from './pages/admin/AccessApproval';
import AdminAnalytics from './pages/admin/Analytics';
import AdminAnnouncements from './pages/admin/Announcements';

// Components
import LoadingScreen from './components/LoadingScreen';

// ─── Route Guards ────────────────────────────────────────────────────────────

// Redirect logged-in users away from auth pages
function PublicRoute({ user, children }) {
  if (user) return <Navigate to="/home" replace />;
  return children;
}

// Redirect unauthenticated users to login
function PrivateRoute({ user, userProfile, loading, children }) {
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (userProfile?.status === 'pending') return <Navigate to="/pending" replace />;
  return children;
}

// Only allow admins
function AdminRoute({ user, userProfile, loading, children }) {
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!['admin', 'superadmin'].includes(userProfile?.role)) return <Navigate to="/home" replace />;
  return children;
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        setUserProfile(snap.exists() ? snap.data() : null);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  const privateProps = { user, userProfile, loading };

  return (
    <>
    <GlobalStyles />
    <BrowserRouter>
      <Routes>

        {/* ── Auth ── */}
        <Route path="/login" element={
          <PublicRoute user={user}><Login /></PublicRoute>
        } />
        <Route path="/request-access" element={
          <PublicRoute user={user}><RequestAccess /></PublicRoute>
        } />
        <Route path="/pending" element={
          user ? <PendingApproval userProfile={userProfile} /> : <Navigate to="/login" replace />
        } />

        {/* ── App ── */}
        <Route path="/home" element={
          <PrivateRoute {...privateProps}><Home userProfile={userProfile} /></PrivateRoute>
        } />
        <Route path="/schedule" element={
          <PrivateRoute {...privateProps}><Schedule userProfile={userProfile} /></PrivateRoute>
        } />
        <Route path="/class-chat" element={
          <PrivateRoute {...privateProps}><ClassChat userProfile={userProfile} /></PrivateRoute>
        } />
        <Route path="/mon-wed" element={
          <PrivateRoute {...privateProps}><MonWed userProfile={userProfile} /></PrivateRoute>
        } />
        <Route path="/tue-thu" element={
          <PrivateRoute {...privateProps}><TueThu userProfile={userProfile} /></PrivateRoute>
        } />
        <Route path="/announcement" element={
          <PrivateRoute {...privateProps}><Announcement userProfile={userProfile} /></PrivateRoute>
        } />
        <Route path="/account" element={
          <PrivateRoute {...privateProps}><Account userProfile={userProfile} /></PrivateRoute>
        } />

        {/* ── Admin ── */}
        <Route path="/admin" element={
          <AdminRoute {...privateProps}><AdminOverview userProfile={userProfile} /></AdminRoute>
        } />
        <Route path="/admin/users" element={
          <AdminRoute {...privateProps}><AdminUsers userProfile={userProfile} /></AdminRoute>
        } />
        <Route path="/admin/access" element={
          <AdminRoute {...privateProps}><AdminAccessApproval userProfile={userProfile} /></AdminRoute>
        } />
        <Route path="/admin/analytics" element={
          <AdminRoute {...privateProps}><AdminAnalytics userProfile={userProfile} /></AdminRoute>
        } />
        <Route path="/admin/announcements" element={
          <AdminRoute {...privateProps}><AdminAnnouncements userProfile={userProfile} /></AdminRoute>
        } />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />

      </Routes>
    </BrowserRouter>
    </>
  );
}