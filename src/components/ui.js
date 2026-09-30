import styled from 'styled-components';

/** Shared card surface — consistent radius/border/shadow for new UI instead
 * of each page hand-rolling its own slightly-different values. */
export const Card = styled.div`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-md);
`;

export const ErrorState = styled(EmptyState)`
  border-style: solid;
  border-color: #fca5a5;
  background: var(--error-bg);
  color: var(--error);
`;

export const PrimaryButton = styled.button`
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.65rem 1.1rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #78350f, #d97706);
  cursor: ${p => (p.disabled ? 'default' : 'pointer')};
  opacity: ${p => (p.disabled ? 0.6 : 1)};
  transition: opacity 0.2s;
  &:hover { opacity: ${p => (p.disabled ? 0.6 : 0.9)}; }
`;

export const SecondaryButton = styled.button`
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.65rem 1.1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  cursor: ${p => (p.disabled ? 'default' : 'pointer')};
  opacity: ${p => (p.disabled ? 0.6 : 1)};
  transition: border-color 0.2s;
  &:hover { border-color: var(--amber); }
`;
