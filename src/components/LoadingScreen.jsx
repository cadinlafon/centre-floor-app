import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Wrap = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: var(--bg-primary);
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid var(--border);
  border-top-color: var(--amber);
  animation: ${spin} 0.7s linear infinite;
`;

const Label = styled.p`
  font-size: 0.85rem;
  color: var(--text-muted);
`;

export default function LoadingScreen() {
  return (
    <Wrap>
      <Spinner />
      <Label>Loading…</Label>
    </Wrap>
  );
}
