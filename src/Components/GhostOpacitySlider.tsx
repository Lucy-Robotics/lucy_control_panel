/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Slider } from 'antd';
import { UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme.ts';
import { setGhostOpacity, useGhostOpacity } from '../hooks/useGhostOpacity';

export const GhostOpacitySlider: React.FC<{ enabled: boolean }> = ({ enabled }) => {
    const opacity = useGhostOpacity();
    const color = enabled ? 'var(--color-highlight)' : UI_TEXT_SECONDARY_MUTED;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color }}>
                <span>GHOST OPACITY</span>
                <span>{Math.round(opacity * 100)}%</span>
            </div>
            <Slider
                min={0.05}
                max={1}
                step={0.05}
                value={opacity}
                onChange={setGhostOpacity}
                disabled={!enabled}
                style={{ margin: 0 }}
                tooltip={{ open: false }}
                aria-label="Ghost opacity"
            />
        </div>
    );
};
