/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const LUCY_THEME_TEMPLATE_CSS = `/**
 * LUCY ROBOTICS CUSTOM THEME TEMPLATE
 *
 * System Color Guidelines (75% - 10% - 15%):
 * - 75% Dominant: --color-main (Surfaces & Backgrounds)
 * - 10% Secondary: --color-secondary (Borders & Framing)
 * - 15% Highlight: --color-highlight (Brand Accent & Active States)
 */

:root {
  /* Surfaces & Backgrounds (75%) */
  --color-main: #141414;
  --color-main-surface: #141414;
  --color-main-elevated: #1e1e1e;
  --color-main-deep: #0a0a0a;

  /* Borders & Framing (10%) */
  --color-secondary: #2B3E50;
  --color-secondary-border: #2B3E50;
  --color-secondary-subtle: rgba(43, 62, 80, 0.4);
  --color-secondary-hover: #3d5873;

  /* Brand Highlight (15%) */
  --color-highlight: #00FF41;
  --color-highlight-light: #33ff66;
  --color-highlight-glow: rgba(0, 255, 65, 0.25);
  --color-highlight-glow-strong: rgba(0, 255, 65, 0.55);

  /* Typography */
  --color-text-primary: #F7F1E5;
  --color-text-secondary: #6C7D8E;
  --color-text-muted: #52677F;
  --color-text-on-highlight: #141414;

  /* Status Colors */
  --color-status-error: #FF4343;
  --color-status-warning: #FFAA00;
  --color-status-info: #00D8FF;
  --color-status-active: #00FF41;

  /* Fonts */
  --font-graphical: 'Orbitron', sans-serif;
  --font-title: 'IBM Plex Mono', monospace;
  --font-content: 'IBM Plex Mono', monospace;
  --font-mono: 'IBM Plex Mono', monospace;

  /* Layout Spacing */
  --spacing-screen: 30px;
  --spacing-standard: 20px;
  --spacing-large: 40px;
  --spacing-small: 12px;
}
`;
