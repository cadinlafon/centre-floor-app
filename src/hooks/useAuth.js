import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

/**
 * useAuth — returns the current Firebase user + their profile from Firestore.
 * Profile updates in real-time (e.g. if admin changes their class or role).
 */
export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    let profileUnsubscribe = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (firebaseUser) {
        profileUnsubscribe = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            if (!snap.exists()) {
              setUserProfile(null);
              return;
            }
            setUserProfile({ uid: snap.id, ...snap.data() });
          },
          (err) => {
            console.error('Failed to load user profile:', err);
            setUserProfile(null);
          }
        );
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const loading = user === undefined;
  const isAdmin = ['admin', 'superadmin'].includes(userProfile?.role);

  const chatAccess = {
    monWed: ['monwed', 'both'].includes(userProfile?.class),
    tueThu: ['tuethu', 'both'].includes(userProfile?.class),
    classChat: !!userProfile,
  };

  return { user, userProfile, loading, isAdmin, chatAccess };
}
