/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * LEGACY UI THEME COMPATIBILITY BRIDGE (DEPRECATED)
 * @deprecated This bridge exists solely for backward compatibility with legacy
 * components. Canonical theme definitions reside in `src/Constants/theme.ts`.
 * Runtime theme resolution and DOM application are handled by `themeService`
 * in `src/Services/theme.service.ts`.
 *
 * For new components, use CSS Custom Properties directly:
 *   - Background: var(--color-main)
 *   - Borders:    var(--color-secondary)
 *   - Accent:     var(--color-highlight)
 *   - Text:       var(--color-text-primary)
 * ============================================================================
 */

import {
    MAIN_COLOR,
    SECONDARY_COLOR,
    HIGHLIGHT_COLOR,
    STATUS_ERROR,
    STATUS_WARNING,
    STATUS_INFO,
    SPACING_SCREEN_BORDER,
    colors,
    rgba,
} from './theme.ts';
import { themeService } from '../Services/theme.service.ts';

// Re-export canonical theme definitions
export * from './theme.ts';

/** @deprecated Use `var(--color-highlight)` or canonical `HIGHLIGHT_COLOR` from `src/Constants/theme.ts` */
export const UI_ACCENT_GREEN_HEX = HIGHLIGHT_COLOR;
/** @deprecated Use `var(--color-highlight)` */
export const UI_ACCENT_GREEN = 'var(--color-highlight)';
export const UI_ACCENT_RGB = '0, 255, 65';

/** @deprecated Use `rgba()` from `src/Constants/theme.ts` */
export function uiAccentRgba(alpha: number): string {
    return rgba(HIGHLIGHT_COLOR, alpha);
}

export const UI_ERROR_RGB = '255, 67, 67';

/** @deprecated Use `rgba()` from `src/Constants/theme.ts` */
export function uiErrorRgba(alpha: number): string {
    return rgba(STATUS_ERROR, alpha);
}

// 75% Dominant Main Surface (resolved dynamically via CSS custom properties)
export const UI_PANEL_BG = 'var(--color-main)';
export const UI_BG_BLACK = 'var(--color-main)';
export const UI_INPUT_SURFACE = 'var(--color-main)';

// 10% Secondary: Borders & Framing only (resolved dynamically via CSS custom properties)
export const UI_BORDER_MUTED = 'var(--color-secondary)';
export const UI_BORDER_STRONG = 'var(--color-secondary)';
export const UI_BORDER_SOFT = 'var(--color-secondary)';
export const UI_BORDER_DIM = 'var(--color-secondary)';

// Text: Warm Parchment (resolved dynamically via CSS custom properties)
export const UI_TEXT_ON_ACCENT = 'var(--color-text-on-highlight)';
export const UI_TEXT_PRIMARY_ON_DARK = 'var(--color-text-primary)';
export const UI_TEXT_SECONDARY_MUTED = 'var(--color-text-secondary)';
export const UI_TEXT_SUBTLE = 'var(--color-text-muted, #52677F)';

// Status & Semantic
export const UI_ERROR = STATUS_ERROR;
export const UI_WARNING = STATUS_WARNING;
export const UI_ACCENT_BLUE = STATUS_INFO;
export const UI_DECORATIVE_CORAL = STATUS_ERROR;

// Component surfaces (resolved dynamically via CSS custom properties)
export const UI_LIST_ROW_BG = 'var(--color-main)';
export const UI_CHROME_SURFACE = 'var(--color-main)';
export const UI_MODAL_SURFACE = 'var(--color-main)';
export const UI_MODAL_HEADER_TOP = 'var(--color-main)';
export const UI_TOGGLE_TRACK_BORDER = 'var(--color-secondary)';

export const UI_SWITCH_DISABLED_BG = 'var(--color-secondary)';
export const UI_SWITCH_DISABLED_BORDER = 'var(--color-secondary)';

export const UI_MODAL_MASK_BG = 'rgba(20, 20, 20, 0.85)';
export const UI_NAV_BAR_BG = 'rgba(20, 20, 20, 0.95)';
export const UI_OVERLAY_BACKDROP_SOFT = 'rgba(20, 20, 20, 0.75)';
export const UI_SHADOW_ELEVATED = `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 1px ${SECONDARY_COLOR}`;

export const UI_COLOR_TRANSPARENT = 'transparent';

export const UI_CANVAS_LIME = HIGHLIGHT_COLOR;
export const UI_CANVAS_RED = STATUS_ERROR;
export const UI_VIDEO_OVERLAY_CYAN = STATUS_INFO;

export const UI_AUTH_ALERT_SURFACE = 'rgba(255, 67, 67, 0.12)';

// Ant Design Tag presets
export const UI_TAG_ACTIVE_PRESET = 'green' as const;
export const UI_TAG_TARGET_PRESET = 'orange' as const;
export const UI_TAG_FLASHED_PRESET = 'purple' as const;
export const UI_TAG_LOADED_PRESET = 'blue' as const;

export const UI_ACCENT_TEXT_SHADOW = `0 0 10px ${rgba(HIGHLIGHT_COLOR, 0.6)}`;
export const UI_ACCENT_BOX_SHADOW_SOFT = `0 0 8px ${rgba(HIGHLIGHT_COLOR, 0.3)}`;
export const UI_ACCENT_BOX_SHADOW_STRONG = `0 0 16px ${rgba(HIGHLIGHT_COLOR, 0.6)}`;
export const UI_PAGE_HEADER_BORDER_BOTTOM = `1px solid ${SECONDARY_COLOR}`;

/**
 * Shared shell padding for main app pages (screen border = 30px per specification).
 */
export const PAGE_CONTENT_STYLE = {
    padding: SPACING_SCREEN_BORDER,
    position: 'relative',
} as const;

/**
 * Dynamic card surface style that adapts to the active theme.
 */
export const UI_CARD_SURFACE_STYLE = {
    background: 'var(--color-main)',
    borderColor: 'var(--color-secondary)',
} as const;

/**
 * Dynamic primary button style that adapts to the active theme.
 */
export const UI_PRIMARY_GREEN_BUTTON_STYLE = {
    backgroundColor: 'var(--color-highlight)',
    borderColor: 'var(--color-highlight)',
    color: 'var(--color-text-on-highlight)',
    fontWeight: 'bold',
} as const;

export const UI_GRADIENT_AUTH_PAGE = `radial-gradient(ellipse at center, ${colors.main.elevated} 0%, ${MAIN_COLOR} 100%)`;
export const UI_GRADIENT_MODAL_HEADER = `linear-gradient(180deg, ${colors.main.elevated}, ${MAIN_COLOR})`;

/**
 * @deprecated Legacy hook. Runtime theme injection is managed centrally by `themeService.init()`.
 */
export function mountUiThemeCssVars(): void {
    themeService.applyActiveTheme();
}
