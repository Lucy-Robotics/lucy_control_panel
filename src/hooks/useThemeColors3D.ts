/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Resolves the active theme's CSS variables into plain color strings for
 * Three.js materials (which cannot consume `var(--…)`), and re-resolves them
 * whenever the theme changes.
 */

import { useEffect, useState } from 'react';
import { themeService } from '../Services/theme.service';
import { HIGHLIGHT_COLOR, STATUS_INFO, STATUS_WARNING, TEXT_PRIMARY } from '../Constants/theme';

export interface ThemeColors3D {
    /** `--color-highlight`: gizmo ring, ghost. */
    accent: string;
    /** `--color-text-primary`: active (dragging) state. */
    active: string;
    /** `--color-status-warning`: stalled command. */
    warning: string;
    /** `--color-status-info`: focused part. */
    focus: string;
}

function readThemeColors(): ThemeColors3D {
    if (typeof document === 'undefined') {
        return { accent: HIGHLIGHT_COLOR, active: TEXT_PRIMARY, warning: STATUS_WARNING, focus: STATUS_INFO };
    }
    const style = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    return {
        accent: read('--color-highlight', HIGHLIGHT_COLOR),
        active: read('--color-text-primary', TEXT_PRIMARY),
        warning: read('--color-status-warning', STATUS_WARNING),
        focus: read('--color-status-info', STATUS_INFO),
    };
}

export function useThemeColors3D(): ThemeColors3D {
    const [colors, setColors] = useState<ThemeColors3D>(readThemeColors);
    useEffect(() => themeService.subscribe(() => setColors(readThemeColors())), []);
    return colors;
}
