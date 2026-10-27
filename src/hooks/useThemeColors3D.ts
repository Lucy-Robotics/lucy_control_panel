/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import { themeService } from '../Services/theme.service';
import { HIGHLIGHT_COLOR, MAIN_ELEVATED, SECONDARY_COLOR, STATUS_WARNING, TEXT_PRIMARY } from '../Constants/theme';

export interface ThemeColors3D {
    accent: string;
    active: string;
    warning: string;
    surface: string;
    border: string;
}

function readThemeColors(): ThemeColors3D {
    if (typeof document === 'undefined') {
        return { accent: HIGHLIGHT_COLOR, active: TEXT_PRIMARY, warning: STATUS_WARNING, surface: MAIN_ELEVATED, border: SECONDARY_COLOR };
    }
    const style = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    return {
        accent: read('--color-highlight', HIGHLIGHT_COLOR),
        active: read('--color-text-primary', TEXT_PRIMARY),
        warning: read('--color-status-warning', STATUS_WARNING),
        surface: read('--color-main-elevated', MAIN_ELEVATED),
        border: read('--color-secondary', SECONDARY_COLOR),
    };
}

export function useThemeColors3D(): ThemeColors3D {
    const [colors, setColors] = useState<ThemeColors3D>(readThemeColors);
    useEffect(() => themeService.subscribe(() => setColors(readThemeColors())), []);
    return colors;
}
