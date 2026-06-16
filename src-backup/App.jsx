import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, db } from './config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Schedule from './pages/Schedule';
import VideoUpload from './pages/VideoUpload';
import Signup from './pages/Signup';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import Dashboard from './pages/Dashboard';
import Videos from './pages/Videos';
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><h3>Loading...</h3></div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/set-password" element={!user ? <SetPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/schedule" element={user ? <Schedule /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        <Route
  path="/videos"
  element={user ? <Videos /> : <Navigate to="/login" />}
/>

<Route
  path="/video/upload"
  element={user ? <VideoUpload /> : <Navigate to="/login" />}
/>
      </Routes>
    </BrowserRouter>
  );
}