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
 *
 * Only the four base colors are required. Surface tiers, lines and grid tints
 * are derived from them automatically; define any of them to override.
 */

:root {
  /* Surfaces & Backgrounds (75%) */
  --color-main: #141414;          /* page canvas */
  --color-surface-1: #1c1c1c;     /* cards & panels */
  --color-surface-2: #232323;     /* headers, inputs, modals */
  --color-surface-3: #2e2e2e;     /* hover & active fills */
  --color-main-deep: #0a0a0a;

  /* Background grid (set to transparent to disable) */
  --color-grid-dot: rgba(247, 241, 229, 0.2);
  --color-grid-line: rgba(247, 241, 229, 0.09);

  /* Borders & Framing (10%) */
  --color-secondary: #2B3E50;
  --color-secondary-border: #2B3E50;
  --color-secondary-subtle: rgba(43, 62, 80, 0.4);
  --color-secondary-hover: #3d5873;
  --color-line: rgba(43, 62, 80, 0.45);   /* soft dividers & frames */

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
