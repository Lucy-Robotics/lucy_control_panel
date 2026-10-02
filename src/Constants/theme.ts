/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * ============================================================================
 * LUCY ROBOTICS DESIGN SYSTEM - SINGLE SOURCE OF TRUTH FOR ALL THEMES & TOKENS
 * ============================================================================
 * 
 * Strict 75% - 10% - 15% Color System:
 * - 75% Main Dominant (Backgrounds, Panels, Canvas): #141414 (Dark Obsidian)
 * - 10% Secondary (Only for borders, subtle framing & small elements): #2B3E50 (Deep Steel Navy)
 * - 15% Highlight (Identifying brand factor, active states, cues, focus): #00FF41 (Terminal Green)
 * 
 * Text Palette:
 * - Primary Text: #F7F1E5 (Warm Parchment - NOT white!)
 * - Secondary / Muted Text: #6C7D8E (Muted Slate)
 * - Text on Highlight: #141414
 * 
 * Title & Branding Rules:
 * - Titles prefixed with '>' in #00ff41
 * - Title separators are '//' in #00ff41
 * - Title text in #F7F1E5
 * - Subtitles: ALL CAPS, with underline
 * 
 * Typography:
 * - GRAPHICAL: Size 50px | Font: Orbitron | Grease: Bold (700)
 * - TITLE: Size 36px (Web 32px) | Font: IBM Plex Mono | Grease: Regular (400) / Bold (700)
 * - CONTENT: Size 20px (Web 16px Regular / 12px Light) | Font: IBM Plex Mono | Grease: Light (300)
 * 
 * Layout Spacing:
 * - 30px: Screen border
 * - 20px: Standard spacing
 * - 40px: Large spacing
 * - 12px: Small spacing
 */

// ============================================================================
// 1. SPACING CONSTANTS
// ============================================================================
export const SPACING_SCREEN_BORDER = 30; // 30px - Screen border
export const SPACING_STANDARD = 20;      // 20px - Standard spacing
export const SPACING_LARGE = 40;         // 40px - Large spacing
export const SPACING_SMALL = 12;         // 12px - Small spacing

export const spacing = {
    screenBorder: `${SPACING_SCREEN_BORDER}px`, // 30px
    standard: `${SPACING_STANDARD}px`,          // 20px
    large: `${SPACING_LARGE}px`,                // 40px
    small: `${SPACING_SMALL}px`,                // 12px
    none: '0px',
    xxs: '4px',
    xs: '8px',
    sm: `${SPACING_SMALL}px`,                   // 12px
    md: `${SPACING_STANDARD}px`,                // 20px
    lg: `${SPACING_SCREEN_BORDER}px`,           // 30px
    xl: `${SPACING_LARGE}px`,                   // 40px
    xxl: '60px',
} as const;

export const PAGE_CONTENT_STYLE = {
    padding: SPACING_SCREEN_BORDER,
    position: 'relative',
} as const;

// ============================================================================
// 2. COLOR PALETTE (THE SINGLE SOURCE OF TRUTH)
// ============================================================================
// 75% Dominant: Dark Canvas & Surface
export const MAIN_COLOR = '#141414';
export const MAIN_DEEP = '#0a0a0a';
export const MAIN_ELEVATED = '#1e1e1e';

// 10% Secondary: Borders, Subtle Framing & Small Elements Only
export const SECONDARY_COLOR = '#2B3E50';

// 15% Highlight: Identifying Brand Factor, Active States & Terminal Cues
export const HIGHLIGHT_COLOR = '#00FF41';

// Text Colors (Warm parchment #F7F1E5, not white!)
export const TEXT_PRIMARY = '#F7F1E5';
export const TEXT_SECONDARY = '#6C7D8E';
export const TEXT_MUTED = '#52677F';
export const TEXT_ON_HIGHLIGHT = '#141414';

// Semantic & Status Colors
export const STATUS_ACTIVE = '#00FF41';
export const STATUS_ERROR = '#FF4343';
export const STATUS_WARNING = '#FFAA00';
export const STATUS_INFO = '#00D8FF';

// Helper utilities for hex and rgba manipulation
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
        return {
            r: parseInt(clean[0] + clean[0], 16),
            g: parseInt(clean[1] + clean[1], 16),
            b: parseInt(clean[2] + clean[2], 16),
        };
    }
    return {
        r: parseInt(clean.substring(0, 2), 16) || 0,
        g: parseInt(clean.substring(2, 4), 16) || 0,
        b: parseInt(clean.substring(4, 6), 16) || 0,
    };
}

export function rgba(hex: string, alpha: number): string {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function adjustBrightness(hex: string, percent: number): string {
    const { r, g, b } = hexToRgb(hex);
    const adjust = (c: number) => Math.min(255, Math.max(0, Math.round(c + (255 * percent) / 100)));
    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

export const colors = {
    mainColor: MAIN_COLOR,
    secondaryColor: SECONDARY_COLOR,
    highlightColor: HIGHLIGHT_COLOR,

    // 75% Main - Dark background & surfaces
    main: {
        base: MAIN_COLOR,
        surface: MAIN_COLOR,
        elevated: adjustBrightness(MAIN_COLOR, 4), // ~#1f1f1f
        deep: adjustBrightness(MAIN_COLOR, -4),     // ~#0a0a0a
        contrastText: TEXT_PRIMARY,
    },

    // 10% Secondary - Only for borders, subtle framing & small elements
    secondary: {
        base: SECONDARY_COLOR,
        border: SECONDARY_COLOR,
        subtleBorder: rgba(SECONDARY_COLOR, 0.4),
        hover: adjustBrightness(SECONDARY_COLOR, 15),
        dark: adjustBrightness(SECONDARY_COLOR, -15),
        panel: MAIN_COLOR,
        text: TEXT_SECONDARY,
    },

    // 15% Highlight - Brand identifier, active states & cues
    highlight: {
        base: HIGHLIGHT_COLOR,
        light: adjustBrightness(HIGHLIGHT_COLOR, 15),
        dark: adjustBrightness(HIGHLIGHT_COLOR, -15),
        glow: rgba(HIGHLIGHT_COLOR, 0.25),
        glowStrong: rgba(HIGHLIGHT_COLOR, 0.55),
        glowSubtle: rgba(HIGHLIGHT_COLOR, 0.12),
        contrastText: TEXT_ON_HIGHLIGHT,
    },

    text: {
        primary: TEXT_PRIMARY,
        secondary: TEXT_SECONDARY,
        muted: TEXT_MUTED,
        inverse: MAIN_COLOR,
        highlight: HIGHLIGHT_COLOR,
    },

    status: {
        active: STATUS_ACTIVE,
        completed: STATUS_ACTIVE,
        pending: SECONDARY_COLOR,
        error: STATUS_ERROR,
        warning: STATUS_WARNING,
        info: STATUS_INFO,
    },

    decorations: {
        border: SECONDARY_COLOR,
        subtleBorder: rgba(SECONDARY_COLOR, 0.35),
        divider: rgba(SECONDARY_COLOR, 0.5),
        gridLines: rgba(SECONDARY_COLOR, 0.25),
        titlePrefix: HIGHLIGHT_COLOR,
        titleSeparator: HIGHLIGHT_COLOR,
    },
} as const;

// ============================================================================
// 3. TYPOGRAPHY (Fonts, Weights / Greases, Sizes)
// ============================================================================
export const fonts = {
    // Graphical display font
    graphical: "'Orbitron', sans-serif",
    // Titles & content font (IBM Plex Mono for everything else)
    title: "'IBM Plex Mono', 'Courier New', monospace",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
    content: "'IBM Plex Mono', 'Courier New', monospace",
} as const;

// Weights ("Greases")
export const fontWeights = {
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800,
    black: 900,
} as const;

// Font Sizes according to specification:
// GRAPHICAL: 50 (Bold)
// Title: 36 (web: 32px Bold)
// Content: 20 (web: 16px Regular, 12px Light)
export const fontSizes = {
    // Graphical display
    graphical: '50px',
    graphicalWeb: '40px',
    // Titles
    title36: '36px',
    titleWeb: '32px',
    // Headings / Sub-titles
    h3: '24px',
    h4: '20px',
    // Content
    content20: '20px',
    webContent: '16px',
    webSmall: '12px',
    xs: '11px',
    xxs: '10px',
} as const;

export const lineHeights = {
    tight: 1.15,
    normal: 1.5,
    relaxed: 1.75,
} as const;

export const letterSpacing = {
    tight: '-0.5px',
    normal: '0px',
    wide: '1px',
    wider: '2px',
    title: '3px',
} as const;

// ============================================================================
// 4. BORDERS & SHAPES
// ============================================================================
export const borders = {
    radius: '0px', // Strict crisp cybernetic 0px
    standard: `1px solid ${SECONDARY_COLOR}`,
    subtle: `1px solid ${rgba(SECONDARY_COLOR, 0.4)}`,
    highlight: `1px solid ${HIGHLIGHT_COLOR}`,
    highlightThick: `2px solid ${HIGHLIGHT_COLOR}`,
} as const;

// ============================================================================
// 5. CSS VARIABLES GENERATOR & ROOT INJECTOR
// ============================================================================
export const CSS_VARIABLES_MAP: Record<string, string> = {
    // 75% Main Dominant
    '--color-main': MAIN_COLOR,
    '--color-main-surface': colors.main.surface,
    '--color-main-elevated': colors.main.elevated,
    '--color-main-deep': colors.main.deep,

    // 10% Secondary (Borders and small elements only)
    '--color-secondary': SECONDARY_COLOR,
    '--color-secondary-border': colors.secondary.border,
    '--color-secondary-subtle': colors.secondary.subtleBorder,
    '--color-secondary-hover': colors.secondary.hover,
    '--color-secondary-dark': colors.secondary.dark,
    '--color-secondary-text': colors.secondary.text,

    // 15% Highlight
    '--color-highlight': HIGHLIGHT_COLOR,
    '--color-highlight-light': colors.highlight.light,
    '--color-highlight-dark': colors.highlight.dark,
    '--color-highlight-glow': colors.highlight.glow,
    '--color-highlight-glow-strong': colors.highlight.glowStrong,
    '--color-highlight-glow-subtle': colors.highlight.glowSubtle,

    // Text (Parchment #F7F1E5)
    '--color-text-primary': TEXT_PRIMARY,
    '--color-text-secondary': TEXT_SECONDARY,
    '--color-text-muted': TEXT_MUTED,
    '--color-text-on-highlight': TEXT_ON_HIGHLIGHT,

    // Status
    '--color-status-error': STATUS_ERROR,
    '--color-status-warning': STATUS_WARNING,
    '--color-status-info': STATUS_INFO,
    '--color-status-active': STATUS_ACTIVE,

    // Typography
    '--font-graphical': fonts.graphical,
    '--font-title': fonts.title,
    '--font-mono': fonts.mono,
    '--font-content': fonts.content,

    '--font-size-graphical': fontSizes.graphical,
    '--font-size-title-36': fontSizes.title36,
    '--font-size-title-web': fontSizes.titleWeb,
    '--font-size-content-20': fontSizes.content20,
    '--font-size-content-web': fontSizes.webContent,
    '--font-size-small-web': fontSizes.webSmall,

    // Layout Spacing
    '--spacing-screen': spacing.screenBorder,
    '--spacing-standard': spacing.standard,
    '--spacing-large': spacing.large,
    '--spacing-small': spacing.small,

    // Borders
    '--border-standard': borders.standard,
    '--border-subtle': borders.subtle,
    '--border-highlight': borders.highlight,

    // Backward-compatibility variables for existing components
    '--ui-accent-green': HIGHLIGHT_COLOR,
    '--ui-text-on-accent': TEXT_ON_HIGHLIGHT,
    '--ui-switch-disabled-bg': '#334455',
    '--ui-switch-disabled-border': SECONDARY_COLOR,
};

/**
 * Injects default CSS variables into document root (:root).
 * Can be overridden at runtime by any custom theme CSS file.
 */
export function injectThemeVariables(force: boolean = false): void {
    if (typeof document === 'undefined') return;
    try {
        const activeTheme = localStorage.getItem('lucy_active_theme_id') || localStorage.getItem('lucy_active_theme');
        const customCss = localStorage.getItem('lucy_custom_theme_css') || localStorage.getItem('lucy_custom_css');
        const isCustomEnabled = localStorage.getItem('lucy_custom_theme_enabled') !== 'false';
        if (!force && isCustomEnabled && (customCss || (activeTheme && activeTheme !== 'default'))) {
            // A non-default or custom theme is active; let themeService handle injection
            return;
        }
    } catch {
        // localStorage unavailable (e.g. security sandbox)
    }

    const root = document.documentElement;
    for (const [key, value] of Object.entries(CSS_VARIABLES_MAP)) {
        root.style.setProperty(key, value);
    }
}

// Auto-inject immediately upon load in the browser if no custom theme is active
if (typeof document !== 'undefined') {
    injectThemeVariables(false);
}

// ============================================================================
// 6. UNIFIED THEME CONFIG EXPORT
// ============================================================================
export const THEME_CONFIG = {
    spacing,
    spacingScreenBorder: SPACING_SCREEN_BORDER,
    spacingStandard: SPACING_STANDARD,
    spacingLarge: SPACING_LARGE,
    spacingSmall: SPACING_SMALL,
    colors,
    fonts,
    fontWeights,
    fontSizes,
    lineHeights,
    letterSpacing,
    borders,
    rgba,
    hexToRgb,
    adjustBrightness,
    injectThemeVariables,
} as const;

export default THEME_CONFIG;
