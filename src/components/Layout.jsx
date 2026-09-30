import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import TopBar from './Topbar';
import BottomNav from './Bottomnav';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';

const Page = styled.div`
  min-height: 100vh;
  background: var(--bg-primary);
`;

const Content = styled.main`
  padding-top: var(--topbar-height);
  padding-bottom: ${p => (p.$keyboardOpen ? '0' : 'var(--bottomnav-height)')};
  min-height: 100vh;
  box-sizing: border-box;
  transition: padding-bottom 0.15s ease;
`;

export default function Layout({ userProfile, isAdmin, children }) {
  const { isKeyboardVisible } = useKeyboardVisible();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut(auth);
    navigate('/login');
  }

  return (
    <Page>
      <TopBar userProfile={userProfile} isAdmin={isAdmin} handleSignOut={handleSignOut} />
      
      <Content $keyboardOpen={isKeyboardVisible}>
        {children}
      </Content>

      {!isKeyboardVisible && (
        <BottomNav userProfile={userProfile} isAdmin={isAdmin} />
      )}
    </Page>
  );
}