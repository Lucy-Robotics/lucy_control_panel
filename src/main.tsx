/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { themeService } from './Services/theme.service.ts';

// Initialize theme engine immediately so saved theme applies before first render
themeService.init();

const rootElement = document.getElementById('root');

const root = createRoot(rootElement as HTMLElement);
root.render(
    <StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </StrictMode>
);
