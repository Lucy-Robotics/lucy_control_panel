/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import {
    STATUS_ERROR,
    fonts,
} from '../Constants/theme.ts';

interface StreamSwitchProps {
    labelA?: string;
    labelB?: string;
    /** false → labelA is active; true → labelB is active */
    value: boolean;
    onChange: (value: boolean) => void;
}

/** Two-label toggle. Clicking either side always switches to the other state. */
export const StreamSwitch: React.FC<StreamSwitchProps> = ({ labelA = 'OFF', labelB = 'ON', value, onChange }) => (
    <div
        className="tui-toggle"
        style={{
            display: 'inline-flex',
            border: '1px solid var(--color-secondary)',
            backgroundColor: 'var(--color-main)',
        }}
    >
        <button
            className={`tui-toggle-button${!value ? ' off' : ''}`}
            onClick={() => onChange(!value)}
            style={{
                padding: '2px 8px',
                fontSize: 10,
                fontFamily: fonts.mono,
                fontWeight: 'bold',
                backgroundColor: !value ? STATUS_ERROR : 'transparent',
                color: !value ? '#ffffff' : 'var(--color-text-secondary)',
                border: 'none',
                cursor: 'pointer',
            }}
        >
            {labelA}
        </button>
        <div style={{ width: 1, backgroundColor: 'var(--color-secondary)' }} />
        <button
            className={`tui-toggle-button${value ? ' on' : ''}`}
            onClick={() => onChange(!value)}
            style={{
                padding: '2px 8px',
                fontSize: 10,
                fontFamily: fonts.mono,
                fontWeight: 'bold',
                backgroundColor: value ? 'var(--color-highlight)' : 'transparent',
                color: value ? 'var(--color-text-on-highlight)' : 'var(--color-text-secondary)',
                boxShadow: 'none',
                border: 'none',
                cursor: 'pointer',
            }}
        >
            {labelB}
        </button>
    </div>
);

export default StreamSwitch;

