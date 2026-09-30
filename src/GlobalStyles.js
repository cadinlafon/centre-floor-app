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
    --border: #c89116;
    --shadow: rgba(120, 53, 15, 0.08);

    /* Radius scale */
    --radius-sm: 8px;
    --radius-md: 14px;
    --radius-lg: 20px;
    --radius-pill: 999px;

    /* Shadow scale */
    --shadow-sm: 0 1px 6px var(--shadow);
    --shadow-md: 0 4px 16px var(--shadow);
    --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.18);

    /* Feedback colors */
    --success: #166534;
    --success-bg: #f0fdf4;
    --warning: #92400e;
    --warning-bg: #fef3c7;
    --error: #dc2626;
    --error-bg: #fef2f2;

    /* Layout */
    --topbar-height: 64px;
    --bottomnav-height: 72px;
  }

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
  }
`;

export default GlobalStyles;