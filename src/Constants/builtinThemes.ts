/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    MAIN_COLOR,
    SECONDARY_COLOR,
    HIGHLIGHT_COLOR,
    TEXT_PRIMARY,
} from './theme.ts';

export interface ThemePreset {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
    colors: {
        main: string;
        secondary: string;
        highlight: string;
        text: string;
    };
    css?: string;
}

export const BUILTIN_THEMES: ThemePreset[] = [
    {
        id: 'default',
        name: 'Lucy (Default)',
        description: 'Official 75-10-15 theme: Rich black (#141414), Gray blue (#2B3E50), electric green highlight (#00FF41), off-white text (#F7F1E5).',
        author: 'Lucy Robotics Team',
        version: '1.0.0',
        colors: {
            main: MAIN_COLOR,
            secondary: SECONDARY_COLOR,
            highlight: HIGHLIGHT_COLOR,
            text: TEXT_PRIMARY,
        },
        css: '',
    },
    {
        id: 'cvd-protanopia',
        name: 'Protanopia',
        description: 'For red-blind vision (protanopia): blue marks OK and active, orange marks errors and yellow marks warnings, so no state relies on red. Built on the Okabe-Ito palette.',
        author: 'Lucy Robotics Team',
        version: '1.0.0',
        colors: {
            main: '#11151B',
            secondary: '#2A3A4D',
            highlight: '#3DA5FF',
            text: '#F3F4F6',
        },
        css: `
:root {
  --color-text-secondary: #A3AEBB;
  --color-text-muted: #8E99A5;
  --color-text-on-highlight: #0B0E12;
  --ui-text-on-accent: #0B0E12;
  --color-text-on-error: #0B0E12;
  --color-status-active: #3DA5FF;
  --color-status-error: #DD7E33;
  --color-status-warning: #F0E442;
  --color-status-info: #E6E6E6;
  --ui-switch-disabled-bg: #2A3A4D;
}
        `.trim(),
    },
    {
        id: 'cvd-deuteranopia',
        name: 'Deuteranopia',
        description: 'For green-blind vision (deuteranopia): sky blue marks OK and active, coral red marks errors and yellow marks warnings, so no state relies on green versus red. Built on the Okabe-Ito palette.',
        author: 'Lucy Robotics Team',
        version: '1.0.0',
        colors: {
            main: '#14161A',
            secondary: '#33404F',
            highlight: '#56B4E9',
            text: '#F2F2F2',
        },
        css: `
:root {
  --color-text-secondary: #A7AFBA;
  --color-text-muted: #929AA3;
  --color-text-on-highlight: #0B0E12;
  --ui-text-on-accent: #0B0E12;
  --color-text-on-error: #0B0E12;
  --color-status-active: #56B4E9;
  --color-status-error: #E07D70;
  --color-status-warning: #F0E442;
  --color-status-info: #E6E6E6;
  --ui-switch-disabled-bg: #33404F;
}
        `.trim(),
    },
    {
        id: 'cvd-tritanopia',
        name: 'Tritanopia',
        description: 'For blue-yellow colour blindness (tritanopia): teal marks OK and active, rose red marks errors and pale pink marks warnings, kept apart by lightness.',
        author: 'Lucy Robotics Team',
        version: '1.0.0',
        colors: {
            main: '#161214',
            secondary: '#3E2C33',
            highlight: '#2EC4B6',
            text: '#F7F0F2',
        },
        css: `
:root {
  --color-text-secondary: #B4A8AD;
  --color-text-muted: #9E9498;
  --color-text-on-highlight: #0B0E12;
  --ui-text-on-accent: #0B0E12;
  --color-text-on-error: #0B0E12;
  --color-status-active: #2EC4B6;
  --color-status-error: #FF5B79;
  --color-status-warning: #FFB3C1;
  --color-status-info: #D9D9D9;
  --ui-switch-disabled-bg: #3E2C33;
}
        `.trim(),
    },
    {
        id: 'cvd-achromatopsia',
        name: 'Monochrome',
        description: 'For achromatopsia: pure grayscale on black. White marks OK, light grey info, mid grey warnings and dark grey errors, about 15 L* apart; labels and icons carry the rest.',
        author: 'Lucy Robotics Team',
        version: '1.0.0',
        colors: {
            main: '#000000',
            secondary: '#3A3A3A',
            highlight: '#FFFFFF',
            text: '#D6D6D6',
        },
        css: `
:root {
  --color-text-secondary: #A8A8A8;
  --color-text-muted: #959595;
  --color-text-on-highlight: #000000;
  --ui-text-on-accent: #000000;
  --color-text-on-error: #000000;
  --color-status-active: #FFFFFF;
  --color-status-error: #838383;
  --color-status-warning: #AAAAAA;
  --color-status-info: #D3D3D3;
  --ui-switch-disabled-bg: #3A3A3A;
}
        `.trim(),
    },
    {
        id: 'lucy-light',
        name: 'Lucy Light',
        description: 'Light theme on the Lucy parchment (#F7F1E5): rich black text, gray-blue framing and headers, Lucy green for active states and steel blue for links and hover. All text meets WCAG AA (4.5:1); control frames meet 3:1.',
        author: 'Lucy Robotics Team',
        version: '1.0.0',
        colors: {
            main: TEXT_PRIMARY,
            secondary: '#6F89A3',
            highlight: '#006C2E',
            text: MAIN_COLOR,
        },
        css: `
:root {
  --color-text-secondary: #4E5D6C;
  --color-text-muted: #53616F;
  --color-text-on-highlight: #F7F1E5;
  --ui-text-on-accent: #F7F1E5;
  --color-text-on-error: #F7F1E5;
  --color-status-active: #006C2E;
  --color-status-error: #B42424;
  --color-status-warning: #895200;
  --color-status-info: #00629E;
  --color-accent-2: #2F5D84;
  --color-accent-2-soft: rgba(47, 93, 132, 0.10);
  --color-highlight-soft: rgba(0, 108, 46, 0.10);
  --color-active-fill: rgba(0, 108, 46, 0.10);
  --color-header-fill: #DEDED7;
  --color-status-tint: 10%;
  --ui-switch-disabled-bg: #D9D2C3;
  --shadow-1: 0 2px 8px rgba(43, 62, 80, 0.10);
  --shadow-2: 0 12px 32px rgba(43, 62, 80, 0.18);
  --shadow-modal: 0 16px 40px rgba(43, 62, 80, 0.20);
  --shadow-toolbar: 0 -8px 24px rgba(43, 62, 80, 0.14);
}
        `.trim(),
    },
];
