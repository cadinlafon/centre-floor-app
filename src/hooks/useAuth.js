import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config';

/**
 * useAuth — returns the current Firebase user + their Firestore profile.
 * Profile updates in real-time (e.g. if admin changes their class or role).
 */
export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Clean up previous profile listener
      if (profileUnsub) profileUnsub();

      if (firebaseUser) {
        // Live-listen to profile so role/class changes reflect instantly
        profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          setUserProfile(snap.exists() ? { uid: firebaseUser.uid, ...snap.data() } : null);
        });
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const loading = user === undefined;
  const isAdmin = ['admin', 'superadmin'].includes(userProfile?.role);
  const isSuperAdmin = userProfile?.role === 'superadmin';

  // Which chat rooms this user can access
  const chatAccess = {
    monWed: ['monwed', 'both'].includes(userProfile?.class),
    tueThu: ['tuethu', 'both'].includes(userProfile?.class),
    classChat: !!userProfile, // all approved users
  };

  return { user, userProfile, loading, isAdmin, isSuperAdmin, chatAccess };
}