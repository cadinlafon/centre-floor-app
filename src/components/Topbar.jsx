import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ANNOUNCEMENTS_SEEN_EVENT,
  announcementSeenKey,
  getSeenAnnouncementId,
} from '../utils/announcementSeen';

const Bar = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--topbar-height);
  background: linear-gradient(135deg, rgb(138, 193, 203) 0%, #8ac1cb 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  z-index: 100;
  box-shadow: 0 2px 8px var(--shadow);
`;

const Title = styled(Link)`
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  text-decoration: none;
`;

const RightSide = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const IconBtn = styled(Link)`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  text-decoration: none;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }
`;

const BellDot = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #dc2626;
  border: 2px solid white;
`;

const AvatarWrapper = styled.div`
  position: relative;
`;

const AvatarButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: white;
  color: var(--brown-dark);
  font-weight: 700;
  font-family: Georgia, serif;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0;

  &:hover {
    opacity: 0.9;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  top: 48px;
  background: var(--bg-card, white);
  border: 1px solid var(--border, #eee);
  border-radius: var(--radius-lg);
  min-width: 240px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 999;
  animation: dropdownIn 0.15s ease-out;

  @keyframes dropdownIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
  background: linear-gradient(135deg, #78350f 0%, #d97706 100%);
`;

const DropdownAvatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  background: white;
  color: var(--brown-dark);
  font-weight: 700;
  font-family: Georgia, serif;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const DropdownIdentity = styled.div`
  min-width: 0;

  p.name {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: white;
    margin: 0 0 0.1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p.email {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.85);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const DropdownList = styled.div`
  padding: 0.4rem;
`;

const DropdownItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.75rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  color: ${p => p.$danger ? '#dc2626' : 'var(--text-primary, #111)'};
  transition: background 0.12s;

  &:hover {
    background: ${p => p.$danger ? '#fef2f2' : 'var(--bg-secondary, #f3f4f6)'};
  }

  span.icon {
    font-size: 1.05rem;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background: var(--border, #eee);
  margin: 0.3rem 0.4rem;
`;

function AdminIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BellIcon() {
  return <span style={{ fontSize: '1.05rem' }}>🔔</span>;
}

export default function TopBar({ userProfile, isAdmin, handleSignOut }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  // Tracks which specific photoURL failed to load, rather than a plain
  // boolean, so a new photo (e.g. after re-upload) automatically gets a
  // fresh chance to load without needing an effect to reset the flag.
  const [erroredPhotoUrl, setErroredPhotoUrl] = useState(null);
  const photoError = erroredPhotoUrl === userProfile?.photoURL;
  const menuRef = useRef();

  const firstLetter = userProfile?.name?.[0]?.toUpperCase() || '?';
  const uid = userProfile?.uid;

  const [latestAnnouncementId, setLatestAnnouncementId] = useState(null);
  const [seenState, setSeenState] = useState(() => ({
    uid,
    id: getSeenAnnouncementId(uid),
  }));

  const seenAnnouncementId =
    seenState.uid === uid ? seenState.id : getSeenAnnouncementId(uid);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLatestAnnouncementId(snap.docs[0]?.id || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function syncSeen(event) {
      if (!event.detail || event.detail.uid === uid) {
        setSeenState({ uid, id: getSeenAnnouncementId(uid) });
      }
    }

    function syncStorage(event) {
      if (event.key === announcementSeenKey(uid)) {
        setSeenState({ uid, id: event.newValue });
      }
    }

    window.addEventListener(ANNOUNCEMENTS_SEEN_EVENT, syncSeen);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener(ANNOUNCEMENTS_SEEN_EVENT, syncSeen);
      window.removeEventListener('storage', syncStorage);
    };
  }, [uid]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const hasUnreadAnnouncements = Boolean(
    latestAnnouncementId &&
    latestAnnouncementId !== seenAnnouncementId &&
    !location.pathname.startsWith('/announcement')
  );

  return (
    <Bar>
      <Title to="/home">Élan Fitness Method</Title>

      <RightSide>
        {isAdmin && (
  <IconBtn to="/admin">
    <AdminIcon />
  </IconBtn>
)}

<IconBtn to="/schedule">
<span style={{ fontSize: "1.1rem" }}>📅</span></IconBtn>

<IconBtn to="/announcement">
  <BellIcon />
  {hasUnreadAnnouncements && <BellDot />}
</IconBtn>

        {/* ─── ACCOUNT DROPDOWN ─── */}
        <AvatarWrapper ref={menuRef}>
          <AvatarButton onClick={() => setMenuOpen(v => !v)}>
            {userProfile?.photoURL && !photoError ? (
              <img
                key={userProfile.photoURL}
                src={userProfile.photoURL}
                alt={userProfile?.name || 'Account'}
                onError={() => setErroredPhotoUrl(userProfile.photoURL)}
              />
            ) : (
              firstLetter
            )}
          </AvatarButton>

          {menuOpen && (
            <Dropdown>
              <DropdownHeader>
                <DropdownAvatar>
                  {userProfile?.photoURL && !photoError ? (
                    <img
                      key={userProfile.photoURL}
                      src={userProfile.photoURL}
                      alt={userProfile?.name || 'Account'}
                      onError={() => setErroredPhotoUrl(userProfile.photoURL)}
                    />
                  ) : (
                    firstLetter
                  )}
                </DropdownAvatar>
                <DropdownIdentity>
                  <p className="name">{userProfile?.name || 'Account'}</p>
                  <p className="email">{userProfile?.email}</p>
                </DropdownIdentity>
              </DropdownHeader>

              <DropdownList>
                <DropdownItem onClick={() => {
                  setMenuOpen(false);
                  navigate('/account');
                }}>
                  <span className="icon">👤</span> Account Page
                </DropdownItem>

                <DropdownItem onClick={() => {
                  setMenuOpen(false);
                  navigate('/report');
                }}>
                  <span className="icon">🚩</span> Report Page
                </DropdownItem>

                <DropdownDivider />

                <DropdownItem
                  $danger
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                >
                  <span className="icon">🚪</span> Logout
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          )}
        </AvatarWrapper>
      </RightSide>
    </Bar>
  );
}