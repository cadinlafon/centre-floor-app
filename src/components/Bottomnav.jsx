import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Nav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottomnav-height);
  background: white;
  border-top: 1.5px solid var(--border);
  display: flex;
  align-items: stretch;
  z-index: 100;
  box-shadow: 0 -2px 12px rgba(120, 53, 15, 0.07);
`;

const Tab = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0.25rem 0.125rem;
  transition: background 0.15s;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 15%;
    right: 15%;
    height: 2.5px;
    border-radius: 0 0 3px 3px;
    background: ${p => p.$active ? '#8ac1cb' : 'transparent'};
    transition: background 0.2s;
  }

  &:hover { background: var(--bg-secondary); }
`;

const TabIcon = styled.span`
  font-size: 1.2rem;
  line-height: 1;
  filter: ${p => p.$active ? 'none' : 'grayscale(0.4) opacity(0.6)'};
  transition: filter 0.2s;
`;

const TabLabel = styled.span`
  font-size: 0.65rem;
  font-weight: ${p => p.$active ? '700' : '500'};
  color: ${p => p.$active ? '#8ac1cb' : 'var(--text-muted)'};
  transition: color 0.2s;
  white-space: nowrap;
`;

const BASE_TABS = [
  { label: 'Home',       icon: '🏠', path: '/home' },
{ label: 'Workouts',   icon: '💪', path: '/workouts' },

  { label: 'Class Chat', icon: '💬', path: '/class-chat' },
];

const MON_WED_TAB = { label: 'Mon/Wed', icon: '🌿', path: '/mon-wed' };
const TUE_THU_TAB = { label: 'Tue/Thu', icon: '🌸', path: '/tue-thu' };

export default function BottomNav({ userProfile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const userClass = userProfile?.class;

  const tabs = [
    ...BASE_TABS,
    ...(userClass === 'monwed' || userClass === 'both' ? [MON_WED_TAB] : []),
    ...(userClass === 'tuethu' || userClass === 'both' ? [TUE_THU_TAB] : []),
  ];

  return (
    <Nav>
      {tabs.map(tab => {
        const active = location.pathname.startsWith(tab.path) &&
          (tab.path !== '/home' || location.pathname === '/home');
        return (
          <Tab key={tab.path} $active={active}
            onClick={() => navigate(tab.path)} aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
          >
            <TabIcon $active={active}>{tab.icon}</TabIcon>
            <TabLabel $active={active}>{tab.label}</TabLabel>
          </Tab>
        );
      })}
    </Nav>
  );
}