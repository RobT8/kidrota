import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initTheme } from './utils/theme';
// Titles only; bundled so it works offline (SIL Open Font License).
import '@fontsource/playfair-display/latin-700.css';
import './styles/index.css';

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
