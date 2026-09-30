import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import styled from 'styled-components';
import TopBar from './Topbar';
import BottomNav from './Bottomnav';

const Shell = styled.div`
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  padding-top: var(--topbar-height);
  padding-bottom: var(--bottomnav-height);
`;

const Sidebar = styled.nav`
  width: 220px;
  background: var(--bg-card);
  border-right: 1.5px solid var(--border);
  padding: 1.5rem 0.75rem;
  flex-shrink: 0;
  position: fixed;
  top: var(--topbar-height);
  bottom: var(--bottomnav-height);
  left: 0;
  overflow-y: auto;
  z-index: 50;

  @media (max-width: 640px) {
    width: 64px;
    padding: 1rem 0.4rem;
  }
`;

const SideLabel = styled.p`
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  padding: 0 0.5rem;
  margin: 0 0 0.5rem;

  @media (max-width: 640px) { display: none; }
`;

const SideBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: none;
  border-radius: 10px;
  background: ${p => p.$active ? 'linear-gradient(135deg, #78350f, #d97706)' : 'none'};
  color: ${p => p.$active ? 'white' : 'var(--text-secondary)'};
  font-size: 0.9rem;
  font-weight: ${p => p.$active ? '600' : '500'};
  cursor: pointer;
  text-align: left;
  margin-bottom: 0.25rem;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: ${p => p.$active ? 'linear-gradient(135deg, #78350f, #d97706)' : 'var(--bg-secondary)'};
  }

  span.icon { font-size: 1.1rem; flex-shrink: 0; }
  span.label {
    @media (max-width: 640px) { display: none; }
  }
`;

const Content = styled.main`
  flex: 1;
  margin-left: 220px;
  padding: 1.75rem 1.5rem;
  min-width: 0;

  @media (max-width: 640px) { margin-left: 64px; padding: 1rem; }
`;

const NAV_ITEMS = [
  { label: 'Overview',        icon: '📊', path: '/admin' },
  { label: 'Users',           icon: '👥', path: '/admin/users' },
  { label: 'Access Approval', icon: '✅', path: '/admin/access' },
  { label: 'Analytics',       icon: '📈', path: '/admin/analytics' },
  { label: 'Announcements',   icon: '📢', path: '/admin/announcements' },
  { label: 'Notifications',   icon: '🔔', path: '/admin/notifications' },
  { label: 'Notification Settings', icon: '⚙️', path: '/admin/notification-settings' },
  { label: 'Workouts',        icon: '🏋️', path: '/admin/workouts' },
];

export default function AdminLayout({ userProfile, isAdmin, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut(auth);
    navigate('/login');
  }

  return (
    <Shell>
      <TopBar userProfile={userProfile} isAdmin={isAdmin} handleSignOut={handleSignOut} />
      <Body>
        <Sidebar>
          <SideLabel>Admin Panel</SideLabel>
          {NAV_ITEMS.map(item => {
            const active = item.path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.path);
            return (
              <SideBtn key={item.path} $active={active} onClick={() => navigate(item.path)}>
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
              </SideBtn>
            );
          })}
        </Sidebar>
        <Content>{children}</Content>
      </Body>
      <BottomNav userProfile={userProfile} isAdmin={isAdmin} />
    </Shell>
  );
}