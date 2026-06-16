import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Page = styled.div`
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--amber);
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const Label = styled.p`
  font-family: Georgia, 'Times New Roman', serif;
  color: var(--brown-light);
  font-size: 1.1rem;
`;

export default function LoadingScreen() {
  return (
    <Page>
      <Spinner />
      <Label>Centre Floor</Label>
    </Page>
  );
}