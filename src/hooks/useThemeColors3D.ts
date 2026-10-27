/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import { themeService } from '../Services/theme.service';
import { HIGHLIGHT_COLOR, STATUS_WARNING, TEXT_PRIMARY } from '../Constants/theme';

export interface ThemeColors3D {
    accent: string;
    active: string;
    warning: string;
}

function readThemeColors(): ThemeColors3D {
    if (typeof document === 'undefined') {
        return { accent: HIGHLIGHT_COLOR, active: TEXT_PRIMARY, warning: STATUS_WARNING };
    }
    const style = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    return {
        accent: read('--color-highlight', HIGHLIGHT_COLOR),
        active: read('--color-text-primary', TEXT_PRIMARY),
        warning: read('--color-status-warning', STATUS_WARNING),
    };
}

export function useThemeColors3D(): ThemeColors3D {
    const [colors, setColors] = useState<ThemeColors3D>(readThemeColors);
    useEffect(() => themeService.subscribe(() => setColors(readThemeColors())), []);
    return colors;
}
