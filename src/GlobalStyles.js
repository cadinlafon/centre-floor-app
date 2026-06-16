import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  :root {
    /* Backgrounds */
    --bg-primary: #fdf6ec;
    --bg-secondary: #fef9f3;
    --bg-card: #ffffff;

    /* Brand */
    --amber: #d97706;
    --amber-light: #f59e0b;
    --brown-dark: #78350f;
    --brown-mid: #92400e;
    --brown-light: #b45309;

    /* Text */
    --text-primary: #1c1917;
    --text-secondary: #57534e;
    --text-muted: #a8a29e;

    /* UI */
    --border: #e7d5b3;
    --shadow: rgba(120, 53, 15, 0.08);

    /* Layout */  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    height: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: Georgia, 'Times New Roman', serif;
    color: var(--text-primary);
  }

  button {
    font-family: inherit;
  }

  input, textarea, select {
    font-family: inherit;
  }

  #root {
    height: 100%;
    padding-top: var(--topbar-height);
  }
`;

export default GlobalStyles;