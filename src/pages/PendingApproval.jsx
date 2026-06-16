import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config';
import styled from 'styled-components';

const Page = styled.div`
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
`;

const Card = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px var(--shadow);
  text-align: center;
`;

const Icon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const Title = styled.h2`
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.6rem;
  color: var(--brown-dark);
  margin: 0 0 0.75rem;
`;

const Body = styled.p`
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 2rem;
`;

const SignOutBtn = styled.button`
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem 1.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;

  &:hover {
    border-color: var(--amber);
    color: var(--amber);
  }
`;

export default function PendingApproval({ userProfile }) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut(auth);
    navigate('/login');
  }

  return (
    <Page>
      <Card>
        <Icon>⏳</Icon>
        <Title>You're on the list!</Title>
        <Body>
          Hi {userProfile?.name?.split(' ')[0] || 'there'}! Your request has been received.
          The instructor will review and approve your access shortly.
          You'll be able to sign in once you're approved.
        </Body>
        <SignOutBtn onClick={handleSignOut}>Sign out</SignOutBtn>
      </Card>
    </Page>
  );
}