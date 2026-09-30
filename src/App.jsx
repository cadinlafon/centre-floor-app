import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GlobalStyles from './GlobalStyles';
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from './hooks/useAuth';
import StudentProfile from './pages/admin/StudentProfile';
// Pages - Auth
import Login from './pages/Login';
import RequestAccess from './pages/RequestAccess';
import SetPassword from './pages/SetPassword';
import PendingApproval from './pages/PendingApproval';
// Pages - App
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import ClassChat from './pages/ClassChat';
import MonWed from './pages/MonWed';
import TueThu from './pages/TueThu';
import Announcement from './pages/Announcement';
import Account from './pages/Account';
import Playlist from './pages/Playlist';
import Videos from './pages/Videos';
import VideoUpload from './pages/VideoUpload';
import Workouts from './pages/Workouts';
// Pages - Admin
import AdminOverview from './pages/admin/Overview';
import AdminUsers from './pages/admin/Users';
import AdminAccessApproval from './pages/admin/AccessApproval';
import AdminAnalytics from './pages/admin/Analytics';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminNotifications from './pages/admin/Notifications';
import AdminNotificationSettings from './pages/admin/NotificationSettings';
import AdminWorkouts from './pages/admin/AdminWorkouts';
import WorkoutEditor from './pages/admin/WorkoutEditor';

// Components
import LoadingScreen from './components/LoadingScreen';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ReportAndSuggest from './pages/ReportAndSuggest';
import { registerPushNotifications, listenForForegroundNotifications } from './utils/pushNotifications';

// ─── Route Guards ─────────────────────────────────────────────────────────────

function PublicRoute({ user, children }) {
  if (user) return <Navigate to="/home" replace />;
  return children;
}

function PrivateRoute({ user, userProfile, loading, children }) {
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (userProfile?.status === 'pending') return <Navigate to="/pending" replace />;
  const isAdmin = ['admin', 'superadmin'].includes(userProfile?.role);
  return <Layout userProfile={userProfile} isAdmin={isAdmin}>{children}</Layout>;
}

function AdminRoute({ user, userProfile, loading, children }) {
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!['admin', 'superadmin'].includes(userProfile?.role)) return <Navigate to="/home" replace />;
  return <AdminLayout userProfile={userProfile} isAdmin={true}>{children}</AdminLayout>;
}

const PromptOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
  padding: 1rem;
`;

const PromptCard = styled.div`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  width: min(100%, 360px);
  box-shadow: var(--shadow-lg);
`;

const PromptTitle = styled.h3`
  margin: 0 0 0.5rem;
  color: var(--brown-dark);
  font-family: Georgia, serif;
`;

const PromptBody = styled.p`
  margin: 0 0 1rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
`;

const PromptActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const PromptButton = styled.button`
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 0.85rem;
  font-weight: 700;
  cursor: pointer;
  background: ${p => p.$primary ? 'linear-gradient(135deg, #78350f, #d97706)' : 'var(--bg-secondary)'};
  color: ${p => p.$primary ? 'white' : 'var(--text-primary)'};
`;

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { user, userProfile, loading } = useAuth();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);

  useEffect(() => {
    if (!userProfile?.uid) return;

    let cancelled = false;

    async function initNotifications() {
      try {
        await registerPushNotifications(userProfile);
        if (!cancelled) await listenForForegroundNotifications();
      } catch (err) {
        console.error('OneSignal initialization failed:', err);
      }
    }

    initNotifications();
    return () => { cancelled = true; };
    // Intentionally scoped to uid only — re-running this on every unrelated
    // profile field change (name, photo, etc.) would re-register push
    // notifications far more often than needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!userProfile?.uid || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (showNotificationPrompt || promptBusy) return;
    // Synchronizing with the browser's own Notification.permission state —
    // exactly the "subscribe to an external system" case effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowNotificationPrompt(true);
  }, [userProfile?.uid, showNotificationPrompt, promptBusy]);

  async function handleEnableNotifications() {
    if (!userProfile?.uid) return;
    setPromptBusy(true);
    try {
      const result = await registerPushNotifications(userProfile, { requestPermission: true });
      if (result) {
        setShowNotificationPrompt(false);
      } else {
        setShowNotificationPrompt(false);
      }
    } catch (err) {
      console.error('Notification prompt failed:', err);
      setShowNotificationPrompt(false);
    } finally {
      setPromptBusy(false);
    }
  }

  const privateProps = { user, userProfile, loading };

  return (
    <>
      <GlobalStyles />
      {showNotificationPrompt && (
        <PromptOverlay>
          <PromptCard>
            <PromptTitle>Enable notifications</PromptTitle>
            <PromptBody>Allow push notifications so you never miss announcements, class messages, and account updates.</PromptBody>
            <PromptActions>
              <PromptButton onClick={() => setShowNotificationPrompt(false)}>Not now</PromptButton>
              <PromptButton $primary onClick={handleEnableNotifications} disabled={promptBusy}>
                {promptBusy ? 'Opening…' : 'Allow'}
              </PromptButton>
            </PromptActions>
          </PromptCard>
        </PromptOverlay>
      )}
      <BrowserRouter>
        {loading ? <LoadingScreen /> : (
        <Routes>
          {/* ── Auth ── */}
          <Route path="/login" element={<PublicRoute user={user}><Login /></PublicRoute>} />
          <Route path="/request-access" element={<PublicRoute user={user}><RequestAccess /></PublicRoute>} />
          {/*
            NOT wrapped in PublicRoute on purpose: createUserWithEmailAndPassword signs
            the user in immediately, which would otherwise cause PublicRoute to redirect
            to /home mid-flow, before the "add a profile photo" step gets to show.
            SetPassword handles its own token-validity states internally.
          */}
          <Route path="/set-password/:token" element={<SetPassword />} />
          <Route path="/pending" element={user ? <PendingApproval userProfile={userProfile} /> : <Navigate to="/login" replace />} />

          {/* ── App ── */}
          <Route path="/home"         element={<PrivateRoute {...privateProps}><Home userProfile={userProfile} /></PrivateRoute>} />
          <Route path="/schedule"     element={<PrivateRoute {...privateProps}><Schedule /></PrivateRoute>} />
          <Route path="/class-chat"   element={<PrivateRoute {...privateProps}><ClassChat userProfile={userProfile} /></PrivateRoute>} />
          <Route path="/mon-wed"      element={<PrivateRoute {...privateProps}><MonWed userProfile={userProfile} /></PrivateRoute>} />
          <Route path="/tue-thu"      element={<PrivateRoute {...privateProps}><TueThu userProfile={userProfile} /></PrivateRoute>} />
          <Route path="/announcement" element={<PrivateRoute {...privateProps}><Announcement /></PrivateRoute>} />
          <Route path="/account"      element={<PrivateRoute {...privateProps}><Account userProfile={userProfile} /></PrivateRoute>} />
          <Route path="/report"      element={<PrivateRoute {...privateProps}><ReportAndSuggest userProfile={userProfile} /></PrivateRoute>} />
          <Route path="/playlist"    element={<PrivateRoute {...privateProps}><Playlist /></PrivateRoute>} />
          <Route path="/videos"      element={<PrivateRoute {...privateProps}><Videos userProfile={userProfile} /></PrivateRoute>} />
          <Route
  path="/workouts"
  element={
    <PrivateRoute {...privateProps}>
      <Workouts />
    </PrivateRoute>
  }
/>

          {/* ── Admin ── */}
          <Route path="/admin"               element={<AdminRoute {...privateProps}><AdminOverview userProfile={userProfile} /></AdminRoute>} />
          <Route path="/admin/users"         element={<AdminRoute {...privateProps}><AdminUsers /></AdminRoute>} />
          <Route path="/admin/access"        element={<AdminRoute {...privateProps}><AdminAccessApproval /></AdminRoute>} />
          <Route path="/admin/analytics"     element={<AdminRoute {...privateProps}><AdminAnalytics /></AdminRoute>} />
          <Route path="/admin/announcements" element={<AdminRoute {...privateProps}><AdminAnnouncements userProfile={userProfile} /></AdminRoute>} />
          <Route path="/admin/notifications" element={<AdminRoute {...privateProps}><AdminNotifications userProfile={userProfile} /></AdminRoute>} />
          <Route path="/admin/notification-settings" element={<AdminRoute {...privateProps}><AdminNotificationSettings /></AdminRoute>} />
          <Route path="/admin/workouts"      element={<AdminRoute {...privateProps}><AdminWorkouts /></AdminRoute>} />
          <Route path="/admin/workouts/:token" element={<AdminRoute {...privateProps}><WorkoutEditor /></AdminRoute>} />
          <Route path="/admin/videos/upload" element={<AdminRoute {...privateProps}><VideoUpload userProfile={userProfile} /></AdminRoute>} />
          <Route path="/admin/users/:token"  element={<AdminRoute {...privateProps}><StudentProfile userProfile={userProfile} /></AdminRoute>} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
          <Route path="/" element={<Navigate to={user ? '/home' : '/login'} replace />} />
        </Routes>
        )}
      </BrowserRouter>
    </>
  );
}