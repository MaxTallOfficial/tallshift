import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SystemStudy } from './SystemStudy';
import './foundations.css';
createRoot(document.getElementById('root')!).render(<StrictMode><SystemStudy /></StrictMode>);
