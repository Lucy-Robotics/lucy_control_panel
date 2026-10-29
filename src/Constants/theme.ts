/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Spacing constants
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

// Color palette
export const MAIN_COLOR = '#141414';
export const MAIN_DEEP = '#0a0a0a';
export const MAIN_ELEVATED = '#1e1e1e';

export const SECONDARY_COLOR = '#2B3E50';

export const HIGHLIGHT_COLOR = '#00FF41';

export const TEXT_PRIMARY = '#F7F1E5';
export const TEXT_SECONDARY = '#6C7D8E';
export const TEXT_MUTED = '#52677F';
export const TEXT_ON_HIGHLIGHT = '#141414';

export const STATUS_ACTIVE = '#00FF41';
export const STATUS_ERROR = '#FF4343';
export const STATUS_WARNING = '#FFAA00';
export const STATUS_INFO = '#00D8FF';

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

export function isHexColor(value: string): boolean {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Lightens (positive) or darkens (negative) any CSS color; exact hex math when possible. */
export function shade(color: string, percent: number): string {
    if (isHexColor(color)) return adjustBrightness(color, percent);
    const mixWith = percent >= 0 ? 'white' : 'black';
    return `color-mix(in srgb, ${color}, ${mixWith} ${Math.abs(percent)}%)`;
}

/** Applies alpha to any CSS color; exact rgba() for hex input. */
export function alpha(color: string, value: number): string {
    if (isHexColor(color)) return rgba(color, value);
    return `color-mix(in srgb, ${color} ${Math.round(value * 100)}%, transparent)`;
}

export interface ThemeBaseColors {
    main: string;
    secondary: string;
    highlight: string;
    text: string;
}

/**
 * Derives the full surface/line/grid token set from the four base colors.
 * Single source of truth for elevation tiers, used by the baseline map,
 * the theme service (for tokens a theme does not define) and Quick Colors.
 */
export function deriveSurfaceTokens({ main, secondary, highlight, text }: ThemeBaseColors): Record<string, string> {
    const surface1 = shade(main, 3);
    const surface2 = shade(main, 6);
    return {
        '--color-bg': main,
        '--color-surface-1': surface1,
        '--color-surface-2': surface2,
        '--color-surface-3': shade(main, 10),
        '--color-main-surface': surface1,
        '--color-main-elevated': surface2,
        '--color-main-deep': shade(main, -4),

        '--color-line': alpha(secondary, 0.45),
        '--color-line-strong': secondary,
        '--color-secondary-subtle': alpha(secondary, 0.4),
        '--color-secondary-hover': shade(secondary, 15),

        '--color-highlight-light': shade(highlight, 15),
        '--color-highlight-dark': shade(highlight, -15),
        '--color-highlight-soft': alpha(highlight, 0.1),
        '--color-highlight-glow': alpha(highlight, 0.25),
        '--color-highlight-glow-strong': alpha(highlight, 0.55),
        '--color-highlight-glow-subtle': alpha(highlight, 0.12),

        '--color-grid-dot': alpha(text, 0.2),
        '--color-grid-line': alpha(text, 0.09),
    };
}

export const colors = {
    mainColor: MAIN_COLOR,
    secondaryColor: SECONDARY_COLOR,
    highlightColor: HIGHLIGHT_COLOR,

    main: {
        base: MAIN_COLOR,
        surface: adjustBrightness(MAIN_COLOR, 3),
        elevated: adjustBrightness(MAIN_COLOR, 6),
        deep: adjustBrightness(MAIN_COLOR, -4),
        contrastText: TEXT_PRIMARY,
    },

    secondary: {
        base: SECONDARY_COLOR,
        border: SECONDARY_COLOR,
        subtleBorder: rgba(SECONDARY_COLOR, 0.4),
        hover: adjustBrightness(SECONDARY_COLOR, 15),
        dark: adjustBrightness(SECONDARY_COLOR, -15),
        panel: adjustBrightness(MAIN_COLOR, 3),
        text: TEXT_SECONDARY,
    },

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
        line: rgba(SECONDARY_COLOR, 0.45),
        divider: rgba(SECONDARY_COLOR, 0.5),
        gridLines: rgba(SECONDARY_COLOR, 0.25),
        titlePrefix: HIGHLIGHT_COLOR,
        titleSeparator: HIGHLIGHT_COLOR,
    },
} as const;

// Typography
export const fonts = {
    graphical: "'Orbitron', sans-serif",
    title: "'IBM Plex Mono', 'Courier New', monospace",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
    content: "'IBM Plex Mono', 'Courier New', monospace",
} as const;

export const fontWeights = {
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800,
    black: 900,
} as const;

export const fontSizes = {
    graphical: '50px',
    graphicalWeb: '40px',
    title36: '36px',
    titleWeb: '32px',
    h3: '24px',
    h4: '20px',
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

// Borders & shapes
export const borders = {
    radius: '0px', // Strict crisp cybernetic 0px
    standard: `1px solid ${SECONDARY_COLOR}`,
    subtle: `1px solid ${rgba(SECONDARY_COLOR, 0.4)}`,
    line: '1px solid var(--color-line)',
    highlight: `1px solid ${HIGHLIGHT_COLOR}`,
    highlightThick: `2px solid ${HIGHLIGHT_COLOR}`,
} as const;

// CSS variables generator
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

    // Surface tiers, lines, grid & glow (derived; overrides the raw entries above)
    ...deriveSurfaceTokens({ main: MAIN_COLOR, secondary: SECONDARY_COLOR, highlight: HIGHLIGHT_COLOR, text: TEXT_PRIMARY }),
    '--shadow-1': '0 2px 8px rgba(0, 0, 0, 0.35)',
    '--shadow-2': '0 12px 32px rgba(0, 0, 0, 0.55)',
};

/**
 * Injects default canonical CSS variables into the document root element.
 * Called exclusively by ThemeService as the baseline layer.
 */
export function injectThemeVariables(target: HTMLElement = document.documentElement): void {
    if (typeof document === 'undefined') return;
    for (const [key, value] of Object.entries(CSS_VARIABLES_MAP)) {
        target.style.setProperty(key, value);
    }
}

// Unified theme config
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
    shade,
    alpha,
    deriveSurfaceTokens,
    injectThemeVariables,
} as const;

export default THEME_CONFIG;
