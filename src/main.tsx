import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { wireHardwareBackButton } from './lib/nav';
import './styles/index.css';

wireHardwareBackButton();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
