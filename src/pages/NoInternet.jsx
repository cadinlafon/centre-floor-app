import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--bg-primary);
`;

const Card = styled.div`
  width: 100%;
  max-width: 460px;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 18px;
  padding: 2rem 1.5rem;
  box-shadow: 0 10px 32px var(--shadow);
  text-align: center;
`;

const Icon = styled.div`
  font-size: 3rem;
  margin-bottom: 0.75rem;
`;

const Title = styled.h1`
  margin: 0 0 0.6rem;
  font-family: Georgia, serif;
  font-size: 1.6rem;
  color: var(--brown-dark);
`;

const Message = styled.p`
  margin: 0 0 1.25rem;
  color: var(--text-secondary);
  line-height: 1.6;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PrimaryBtn = styled.button`
  width: 100%;
  padding: 0.85rem 1rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #78350f, #d97706);
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
`;

const SecondaryBtn = styled.button`
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
`;

export default function NoInternet() {
  const navigate = useNavigate();

  function handleRefresh() {
    window.location.reload();
  }

  function handleOpenSettings() {
    const candidates = [
      'android.settings.WIFI_SETTINGS',
      'App-Prefs:root=WIFI',
      'wifi://',
    ];

    for (const target of candidates) {
      try {
        window.location.href = target;
        return;
      } catch {
        // fall through to fallback
      }
    }

    navigate('/no-internet', { replace: true });
  }

  return (
    <Page>
      <Card>
        <Icon>📶</Icon>
        <Title>No internet connection</Title>
        <Message>
          The app cannot reach the internet right now. Please reconnect and try again.
        </Message>
        <Actions>
          <PrimaryBtn onClick={handleRefresh}>Refresh</PrimaryBtn>
          <SecondaryBtn onClick={handleOpenSettings}>Open Wi‑Fi settings</SecondaryBtn>
        </Actions>
      </Card>
    </Page>
  );
}
