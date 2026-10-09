/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    MAIN_COLOR,
    SECONDARY_COLOR,
    HIGHLIGHT_COLOR,
    TEXT_PRIMARY,
} from './theme';

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
        id: 'midnight-cyan',
        name: 'Midnight Neon',
        description: 'Deep space obsidian with electric cyan accents and sleek slate borders.',
        author: 'Community',
        version: '1.0.0',
        colors: {
            main: '#0B0F19',
            secondary: '#1E293B',
            highlight: '#00D8FF',
            text: '#F1F5F9',
        },
        css: `
:root {
  --color-main: #0B0F19;
  --color-main-surface: #0B0F19;
  --color-main-elevated: #131B2E;
  --color-main-deep: #06080E;
  --color-secondary: #1E293B;
  --color-secondary-border: #1E293B;
  --color-secondary-subtle: rgba(30, 41, 59, 0.45);
  --color-highlight: #00D8FF;
  --color-highlight-light: #4DE4FF;
  --color-highlight-glow: rgba(0, 216, 255, 0.25);
  --color-highlight-glow-strong: rgba(0, 216, 255, 0.55);
  --color-text-primary: #F1F5F9;
  --color-text-secondary: #94A3B8;
  --ui-accent-green: #00D8FF;
}
        `.trim(),
    },
    {
        id: 'solar-tactical',
        name: 'Solar Tactical',
        description: 'High-contrast military aerospace theme with amber telemetry and charred carbon surfaces.',
        author: 'Community',
        version: '1.0.0',
        colors: {
            main: '#121212',
            secondary: '#3E3224',
            highlight: '#FFB300',
            text: '#FFF8E7',
        },
        css: `
:root {
  --color-main: #121212;
  --color-main-surface: #121212;
  --color-main-elevated: #1B1A17;
  --color-main-deep: #0A0A09;
  --color-secondary: #3E3224;
  --color-secondary-border: #3E3224;
  --color-secondary-subtle: rgba(62, 50, 36, 0.45);
  --color-highlight: #FFB300;
  --color-highlight-light: #FFC94D;
  --color-highlight-glow: rgba(255, 179, 0, 0.25);
  --color-highlight-glow-strong: rgba(255, 179, 0, 0.55);
  --color-text-primary: #FFF8E7;
  --color-text-secondary: #A89B88;
  --ui-accent-green: #FFB300;
}
        `.trim(),
    },
    {
        id: 'synthwave-crimson',
        name: 'Synthwave Void',
        description: 'Vibrant neon hot-pink highlighting on deep violet-black shadows with rose borders.',
        author: 'Community',
        version: '1.0.0',
        colors: {
            main: '#13091B',
            secondary: '#391945',
            highlight: '#FF2A6D',
            text: '#FCEEF5',
        },
        css: `
:root {
  --color-main: #13091B;
  --color-main-surface: #13091B;
  --color-main-elevated: #1D0E29;
  --color-main-deep: #09030E;
  --color-secondary: #391945;
  --color-secondary-border: #391945;
  --color-secondary-subtle: rgba(57, 25, 69, 0.45);
  --color-highlight: #FF2A6D;
  --color-highlight-light: #FF5E91;
  --color-highlight-glow: rgba(255, 42, 109, 0.25);
  --color-highlight-glow-strong: rgba(255, 42, 109, 0.55);
  --color-text-primary: #FCEEF5;
  --color-text-secondary: #A8869E;
  --ui-accent-green: #FF2A6D;
}
        `.trim(),
    },
    {
        id: 'matrix-terminal',
        name: 'Matrix Core',
        description: 'Pure CRT terminal aesthetic: pitch black background, matrix phosphor green and deep green framing.',
        author: 'Community',
        version: '1.0.0',
        colors: {
            main: '#050D08',
            secondary: '#16301D',
            highlight: '#00FF41',
            text: '#D4FAD9',
        },
        css: `
:root {
  --color-main: #050D08;
  --color-main-surface: #050D08;
  --color-main-elevated: #0C1A11;
  --color-main-deep: #020603;
  --color-secondary: #16301D;
  --color-secondary-border: #16301D;
  --color-secondary-subtle: rgba(22, 48, 29, 0.45);
  --color-highlight: #00FF41;
  --color-highlight-light: #4DFF7B;
  --color-highlight-glow: rgba(0, 255, 65, 0.3);
  --color-highlight-glow-strong: rgba(0, 255, 65, 0.65);
  --color-text-primary: #D4FAD9;
  --color-text-secondary: #74A07B;
  --ui-accent-green: #00FF41;
}
        `.trim(),
    },
];
